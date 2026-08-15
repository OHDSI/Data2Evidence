import {
  WebRKernel,
  type KernelConfig,
  type KernelOutput,
} from '@trex/notebook/src/index'
import { buildRD2EBootstrapCode } from './rD2EBootstrap'

// WebRKernel subclass that loads d2e's rD2E as part of connect(). The upstream
// (generic) WebRKernel reports status='idle' once WebR + the Strategus spec
// builder are ready, but it no longer defines rD2E or shims `library(rD2E)`.
// Running the bootstrap inside connect() means connect() does not resolve until
// rD2E is available; execute() additionally awaits the bootstrap so a caller
// that doesn't await connect() (or a fast first cell) can't race it. Mirrors
// PyqeReadyPyodideKernel.
export class RD2EReadyWebRKernel extends WebRKernel {
  private rD2EReady: Promise<void> | null = null
  private isBootstrapping = false

  async connect(config: KernelConfig): Promise<void> {
    await super.connect(config)
    this.rD2EReady = this.runBootstrap()
    try {
      await this.rD2EReady
    } catch (err) {
      // A failed bootstrap leaves rD2E undefined. Reset so a future reconnect
      // retries; re-throw so callers see the failure.
      this.rD2EReady = null
      throw err
    }
  }

  async disconnect(): Promise<void> {
    this.rD2EReady = null
    this.isBootstrapping = false
    return super.disconnect()
  }

  async interrupt(): Promise<void> {
    // super.interrupt() may recreate the kernel via this.connect() (virtual
    // dispatch), which re-enters this override and re-runs the bootstrap. Clear
    // the old promise up front so any in-flight execute() doesn't proceed
    // against a dying session.
    this.rD2EReady = null
    return super.interrupt()
  }

  async *execute(
    code: string,
    language: 'python' | 'r'
  ): AsyncIterable<KernelOutput> {
    if (this.rD2EReady && !this.isBootstrapping) {
      await this.rD2EReady
    }
    yield* super.execute(code, language)
  }

  private async runBootstrap(): Promise<void> {
    this.isBootstrapping = true
    try {
      const code = buildRD2EBootstrapCode()
      // super.execute() bypasses our own override (which awaits rD2EReady and
      // would deadlock the bootstrap on itself).
      for await (const output of super.execute(code, 'r')) {
        if (output.type === 'error') {
          console.warn('rD2E bootstrap error:', output.evalue)
        }
      }
    } finally {
      this.isBootstrapping = false
    }
  }
}
