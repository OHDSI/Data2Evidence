type LifecycleProps = { name?: string };
type Lifecycle<P> = (props: P) => Promise<unknown>;

interface ParcelLifecycles<P> {
  bootstrap: Lifecycle<P>;
  mount: Lifecycle<P>;
  unmount: Lifecycle<P>;
  update?: Lifecycle<P>;
}

/**
 * Keep the props a parcel was mounted with when the host updates it.
 *
 * single-spa replaces parcel props on `update` instead of merging them, and
 * Atlas3 updates its plugin outlets with `{ hostContext }` only. Without this,
 * the first update removes `isAtlas`, `getToken`, `appId` and `authContext`, so
 * the Wizard falls back to the portal layout and loses its data source.
 * Props are kept per parcel `name`, the key single-spa-react also uses.
 */
export function keepMountPropsOnUpdate<P extends LifecycleProps>(
  lifecycles: ParcelLifecycles<P>,
): Required<ParcelLifecycles<P>> {
  const propsByParcel = new Map<string | undefined, P>();

  const withMountProps = (props: P): P => ({ ...propsByParcel.get(props.name), ...props });

  return {
    bootstrap: lifecycles.bootstrap,
    mount: (props) => {
      propsByParcel.set(props.name, props);
      return lifecycles.mount(props);
    },
    update: (props) => {
      const merged = withMountProps(props);
      propsByParcel.set(props.name, merged);
      return lifecycles.update ? lifecycles.update(merged) : Promise.resolve();
    },
    unmount: (props) => {
      const merged = withMountProps(props);
      propsByParcel.delete(props.name);
      return lifecycles.unmount(merged);
    },
  };
}
