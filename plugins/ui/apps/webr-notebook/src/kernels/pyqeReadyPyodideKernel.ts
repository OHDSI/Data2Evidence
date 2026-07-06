import {
  PyodideKernel,
  type KernelConfig,
  type KernelOutput,
} from '@trex/notebook/src/index'
import { buildPyqeBootstrapCode } from './pyqeBootstrap'

// PyodideKernel subclass that runs the d2e pyqe bootstrap as part of connect().
// The base PyodideKernel reports status='idle' as soon as Pyodide init finishes,
// but at that point /home/pyodide/pyqe still holds the submodule's vendored
// copy. If we kicked off the bootstrap fire-and-forget from a status listener,
// a fast user cell (or any auto-mount routing) could race the rmtree+rewrite
// and either import the vendored pyqe or land mid-rewrite. Embedding the
// bootstrap in connect() means connect() does not resolve until pyqe is the
// d2e copy. execute() additionally awaits the bootstrap so any caller that
// doesn't await connect() is still safe.
export class PyqeReadyPyodideKernel extends PyodideKernel {
  private pyqeReady: Promise<void> | null = null
  private isBootstrapping = false

  async connect(config: KernelConfig): Promise<void> {
    await super.connect(config)
    this.pyqeReady = this.runBootstrap()
    try {
      await this.pyqeReady
    } catch (err) {
      // Failed bootstrap leaves pyqe as the vendored copy. Reset state so a
      // future reconnect retries; re-throw so callers see the failure.
      this.pyqeReady = null
      throw err
    }
  }

  async disconnect(): Promise<void> {
    this.pyqeReady = null
    this.isBootstrapping = false
    return super.disconnect()
  }

  async interrupt(): Promise<void> {
    // super.interrupt() terminates the worker, then calls this.connect(config)
    // via virtual dispatch — that re-enters this override and re-runs the
    // bootstrap. Clear the old promise up front so any in-flight execute()
    // doesn't proceed against a dying worker.
    this.pyqeReady = null
    return super.interrupt()
  }

  async *execute(
    code: string,
    language: 'python' | 'r'
  ): AsyncIterable<KernelOutput> {
    if (this.pyqeReady && !this.isBootstrapping) {
      await this.pyqeReady
    }
    yield* super.execute(code, language)
  }

  private async runBootstrap(): Promise<void> {
    this.isBootstrapping = true
    try {
      const code = buildPyqeBootstrapCode()
      // super.execute() bypasses our own override (which awaits pyqeReady and
      // would deadlock the bootstrap on itself).
      for await (const _output of super.execute(code, 'python')) {
        void _output
      }
    } finally {
      this.isBootstrapping = false
    }
  }
}
