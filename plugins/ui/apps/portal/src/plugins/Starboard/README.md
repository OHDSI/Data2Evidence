# 🌑 Starboard Notebook for ALP Portal using Iframe 

## Enabling Starboard Notebook for Researchers
Through the admin portal, the Notebooks Feature Flag should be enabled to the researcher user. Notebooks will be shared amongst researcher in the same study. 

## Running starboard-notebook-base locally
`starboard-notebook-base` located in the resources folder, stores the build file of [starboard-notebook](https://github.com/alp/alp-starboard-notebook-base). `starboard-notebook-base` contains the starboard-notebook code that has been modified to accommodate the needs for the ALP portal such as JWT Token and Jupyter Kernels. The source link (index.html) from the modified build files will be imported to `StarboardEmbed` to be run locally.

Notebooks which stores Starboard Notebook is located in the Dataset Overview. Build and Start the portal to run `starboard-notebook-base` using `nx start portal`.

## Communication between starboard-notebook-base and portal plugin using starboard-wrap

[starboard-wrap](https://github.com/gzuidhof/starboard-wrap) build file is stored to import `StaboardEmbed` which retrieve the Starboard Notebook from the source link, and encapsulate them into an iframe element. The source link is the ALP CDN link, `index.html` that contains the entire starboard-notebook. 

`StarboardEmbed` exports elements like `runtime` and `unsaved` (datas related to the current notebook) to be manipulated by the ALP portal. 

### Examples:
- `runtime.notebookContent` stores the current notebook content: notebook cells. 
- `unsaved` is the notebook content state where it has been saved or not. (to be manipulated).

## Importing and Exporting Jupyter(.ipynb) files into Starboard
[jupystar](https://github.com/gzuidhof/jupystar) build file is stored within `utils` folder and some built-in functions are exported from here. 
- `notebookContentToText`: converts notebookContent, which stores the content in Starboard Notebook  in `StarboardNotebook` type into text. 
- `convertJupyterToStarboard`: converts `JupyterNotebook` into `NotebookContent` type 
- `convertStarboardToJupyter`: converts `NotebookContent ` into `JupyterNotebook` type 

Jupyter File imported are run through `convertJupyterToStarboard` and `notebookContentToText` to extract the jupyter content in starboard text format. The text will then be stored in the database. 
Jupyter File extracted from Starboard File are run through `convertStarboardToJupyter` and exported in .ipynb format.

## Token Management and Jupyter Kernel 

`starboard-notebook-base` contains codes that will run and remove the last 2 starboard cells when the notebookContent is first imported in `StarboardEmbed`. This means cells to handle the JWT Token and Importing Jupyter Kernel are added at the end of every notebookContent source from database. 

To make changes of the INIT function, head to `alp-starboard-notebook-base` fork and edit the files accordingly. 

## Limitations of Starboard in iframe 
With iframe, the portal do not have access to the built-in functions within `starboard-notebook-base` such as `runCell` and `removeCell` from the `StarboardEmbed`. All logic that requires the functions from `starboard-notebook-base` must be executed within the [file](https://github.com/alp/alp-starboard-notebook-base). 

To extract the starboard elements functions, `<starboard-notebook>` must first exist in the DOM, which creates a lag if a function is ever to be performed. 

Example: 
```
let sbEl: StarboardNotebookElement | null = null;
while (!sbEl) {
  await sleep(300);
  sbEl = document.querySelector("starboard-notebook") as unknown as StarboardNotebookElement;
  consr runtime = sbEl.getRuntime();
}
```