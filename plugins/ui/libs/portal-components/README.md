# Portal Components Library

The library provides the shared components and svg icons for ALP Portal with Storybook setup by doing the following:

- Run `svgr` to convert svg images to React components
- Run `rollup` to bundle the library
- Run `storybook` to run Storybook

### Commands

Build:

```
yarn build
```

Run tests:

```
yarn test
```

### ALP Usage

- In `alp-ui`, run `nx build @portal/components`
- Add `"@portal/components": "^1.0.0"` in package.json in React app
- Below is a sample on how we use the components:

```
import { Loader, MenuIcon } from "@portal/components";
// Implementation...
if (loading) return <Loader />;

// Add icon
<MenuIcon />
```
