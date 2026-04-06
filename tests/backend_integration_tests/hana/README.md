# http-specs: HTTP-based integration test frameworkoid for MRI and Patient Summary

This folder contains a node.js module called _http-specs_ for running integration tests of MRI and Patient Summary via HTTP, as well as the integration test suite itself. It is a collection of utilities that allow you to use the [Mocha](https://mochajs.org/) framework to write concise, expressive integrations tests which communicate with the backend just like the frontend would.

It still relatively primitive and focused on MRI analytics and Patient Summary, hence _frameworkoid_ rather than _framework_. Currently, just a small subset of the integration tests implemented in XSUnit (but also entirely new, reorganized tests suite) are implemented here.

## What's in the box?

Here is what the frameworkoid currently offers:

- A custom test runner (wrapping Mocha) that allows passing configuration parameters from the command line
- A patient builder to build and persist patients needed for tests
- Request builders to build requests for the MRI analytics and Patient Summary endpoints
- Result parsers for querying the returned results
- Utilities for cloning the needed tables to a test schema and redirecting requests to it
- Utilities for loading configurations (global, MRI, CDW, and Patient Summary)

To get an overview over the functionality, you can run the unit tests using `npm test`. The unit tests are written using [Mocha](https://mochajs.org/), with [Chai](http://chaijs.com/) for assertions and [Sinon](http://sinonjs.org/) for mocking. *If you want to contribute, please also write tests (stored in the *test* folder)*. You can also generate the JSDoc documentation using `npm run jsdoc`.

**These tests should only be run on private or dedicated test systems!**: They do run in a separate test schema and do not touch the data in the default schema. However, since the locations of the core tables to use are currently global, all requests are redirected to the test tables during test execution. This also implies that (1) it is not possible to run the tests in parallel on the same system since we cannot access multiple schemas, and (2) if the test are interrupted before the clean-up at the end (e.g. by manually terminating the process or by an error in the final hook), the global settings need to be manually reset to point to the standard tables.

## Getting started

The tests form a module Node.js so you of course need Node installed (version 5.11 or higher). To install the package on your local machine with the repo checked out, navigate to this directory (_/qa/backend_integration_tests_) and run

```
npm install
```

To execute the integration tests against the system _[MY_HOSTNAME]:80[MY_INSTANCE_NO]_, run

```
node run_specs.js --host MY_HOSTNAME --instance_no MY_INSTANCE_NO
```

You can pass additional parameters, including all available Mocha parameters (see section on this below). This is particularly useful for running the tests as part of continuous integration: to output the test report in xunit (XML) format to a file, use the _mocha-jenkins-reporter_ mocha reporter, passing the output file as the environment variable _JUNIT_REPORT_PATH_, like this:

```
JUNIT_REPORT_PATH=./output.xml node run_specs.js --host test-machineX --instance_no 0 --mocha-reporter mocha-jenkins-reporter
```

By default, all files with names ending on _\_test.js_ in the _/specs_ folder are assumed to be test files. You can change this by using the `--file_pattern` option when running _run_specs.js_ and passing a JavaScript regular expression syntax, e.g.

```
node run_specs.js --host MY_HOSTNAME --instance_no MY_INSTANCE_NO --file_pattern mytest.*
```

## Why test via HTTP?

There already is a significant number of integration test for MRI (and the platform) implemented using the [jasmine](http://jasmine.github.io/)-based XSUnit framework that runs on the XSEngine and hence can directly test backend functions. So why ever bother going over HTTP? Here are a few reasons:

1. **The tests specify the API the frontend actually uses**: Since the test runs against the same endpoints as the frontend, they can capture exactly what the frontend need to know, allowing a clean separation of the frontend and backend concerns.
2. **Independent of all backend implementation details**: As long as the HTTP APIs stays the same the tests will do their job, making them more useful for major refactorings and even complete rewrites in a different language or on a different platform.
3. **Free choice of tools**: By pulling the tests onto node, we gain access to a wide range of powerful testing tools that can be mixed & matched without having to wait for them being made available on XSEngine.
4. **More room for tweaking**: While running the tests over HTTP does of course add some overhead (HTTP calls instead of function calls, need to set up environment over HTTP etc.), it still offers advantages w.r.t. performance optimization. For instance, we avoid the HTTP timeout errors generated by XSUnit for very slow suites and we can use nodes asynchronous IO to speed up execution.

## How the integration tests are structured

The integration tests are all stored in the _specs_ folder. The test files themselves are normal Mocha test files that use the frameworkoid utilities to communicate with the backend. To distinguish them from utility files etc., only files matching the patter _\_test.js_ are assumed to be test files. You can change this pattern (which uses JavaScript regular expression syntax) by changing the variable `file_pattern` in _specs/environment.json_ or by using `--file_pattern` option when running _run_specs.js_.

The default configuration is stored in the file _environment.json_ inside the _specs_ folder. This includes the login details needed to access the DB, MRI, and the platform. However,to load the configuration, you need to load the dynamically written file _.envir_ (since some default parameters might be overwritten). From a specs file in the _specs_ directory, you do this as follows:

```javascript
var HostConfig = require('../lib/host_config')
var environmentPath = path.join(__dirname, '.envir')
var hostConfig = new HostConfig(environmentPath)
```

The `HostConfig`module will synchronously load and store the data.

## Using the patient builder API

The patient builder (_lib/patient_builder.js_) allows you to build and persist example patient for your patients using a fluent builder API (i.e. by method chaining). The API mirrors the CDW configuration. It works by creating an instance of the PatientBuilder class and then chaining call to add interactions, attributes etc. Basically, the chained list of call will mirror the JSON representation of the patient. Here are the basic functions:

**Building a patient history**

- `patient()`: Start a new patient
- `condition(conditionName)`: Start a new condition of the given type
- `interaction(interactionName, startTime, endTime)`: Add an interaction, either directly under the patient (if called before any call to _condition()_) or to the condition that was last started. The start and end times are both optional; they are always written directly to the DB as UTC times and can both be specified in either the format _YYYY-MM-DD_ (translates to first timestamp on that date) or _YYYY-MM-DDTHH:mm:ss.sssZ_.
- `attribute(attributeName, attributeValue)`: Add a value to the given attribute, either directly to the patient (if called before any call to _interaction()_) or the last interaction started.

**Storing and persisting patient histories**

- `buildJson()`: Return a JSON representation of the patient
- `add()`: Add the patient to the current patient set stored in the builder (you can then use the same builder to add and store more patients)
- `buildJsonArray()`: Return an array containing all patients in the current patient set
- `persistAll(patientCreator, callback)`: Persist (in parallel) all patients in the current patient set to the DB. The arguments are an instance of the _PatientCreator_ class (_lib/patient_creator.js_) that handles the actual writing and a callback to be executed once all patients have been written (error-first signature, as per node convention).

Here is a complete example:

```javascript
var hdb = require('hdb')
var PatientBuilder = require('../lib/patient_builder')
var patientBuilder = new PatientBuilder()

// Build two patients, adding them to the patient set
patientBuilder
  .patient()
  .attribute('dateOfBirth', '1900-01-01T00:00:00.000Z')
  .condition('acme')
  .interaction('radio', '1949-01-01', '1949-01-01') // Age 49
  .attribute('radio_ops', 'O1')
  .attribute('radio_dosage', 149)
  .add()
patientBuilder
  .patient()
  .attribute('dateOfBirth', '1900-01-01T00:00:00.000Z')
  .condition('acme')
  .interaction('radio', '1944-01-01', '1944-01-01') // Age 44
  .attribute('radio_ops', 'O2')
  .attribute('radio_dosage', 144)
  .add()

// Set up database client
var hdbSystemsCredentials = {
  /*Hana login data*/
}
var patientCreationHdbClient = hdb.createClient(hdbSystemsCredentials)
patientCreationHdbClient.on('error', function (err) {
  console.error('Network connection error: ', err)
})
// Create patient creator instance
var createConfigFilePath = path.join(__dirname, 'acme_creation_config.json')
var createConfig = JSON.parse(fs.readFileSync(createConfigFilePath))
var patientCreator = new PatientCreator('My_TEST_SCHEMA', patientCreationHdbClient, createConfig)

// Do asynchronous set-up of the patient creator and use it to persist the patients
patientCreator.init(function () {
  patientBuilder.persistAll(patientCreator, function (err) {
    console.log('Done!')
  })
})
```

## Using the request builder API

The request builder (_lib/request_builder.js_) is very similar to the patient builder; it allows you to build and fire MRI analytic requests using a fluent builder API (i.e. by method chaining). The API mirrors the filtercard structure so that request are built up like they would be in the UI.The basic builder API is as follows:

**Setting up a request**

- `RequestBuilder(configMetaData, mriConfig)` Constructor for the request builder object. _configMetaData_ is the meta-information about the MRI config (version etc.) to be used that is attached to the outgoing requests. _mriConfig_ is the JSON-form of the MR configuration to be used. The two parameters shoukd of course match in the sense that the passed MRI config should be the one that is stored in the backend with the metadata passed. This is best ensured by retrieve these information from the current SetupManager using the `getMriConfiguration()` and `getMriConfigurationMetadata()` methods.
- `request()`: Starts a new request
- `guarded()`: Set the request object to be guarded (i.e. use guarded tables).

**Filter settings**

- `matchall()`: Start the "match all" section
- `matchany()`: Start the "match any" section
- `basicdata()`: Start the basic data function (not inself a filtering operation)
- `filtercard(interactionName, tag)`: Add a filtercard of the specified type; the optional _tag_ parameters specifies a name for this filtercard so that it can be referred to later (e.g. for successor constraints)
- `exclude()`: Sets the preceeding interaction to be excluded
- `absolutetime(constraint)`: Add an absolute time constraint to the preceding filtercard. The constraint has to be given the format used in the request itself, e.g. a time range would be given as follows: _{"and": [{"op": ">=", "value": "20100101", "type": "abstime"}, {"op": "<=", "value": "20101231", "type": "abstime"}]}_.
- `relativetime(type, firstTag, secondTag, constraint)`: Add a relative time contrainst between two filtercards. Currently, the only valid type is _isSucceededBy_, the successor constraints. The two tag parameters specify the cards to be linked (they are set when calling _filtercard()_). The optional constraint on the interval between the events (must be in the format used in the request).
- `attribute(attributeName, attributeConstraint)`: Add an attribute to the preceding filtercard (or basicdata), optionally with a constraint. The constraint has to be given the format used in the request itself, e.g. _{"op": "=", "value": "Alive"}_ for an equality constraint.

**Chart settings**

- `chart()`: Start the section defining the chart options
- `xaxis(tag, attribute, axisNo, binsize)`: Assign the attribute specified (as an attribute name) in the variable _attribute_ from the filtercard with the tag _tag_ to the x-axis. If no axis number is passed, it is set to 1. The second, optional argument gives the bin-size (for numerical parameters).
- `yaxis(tag, attribute, axisNo, aggregation)`: Assign the attribute specified (as an attribute name) in the variable _attribute_ from the filtercard with the tag _tag_ to the y-axis. If no axis number is passed, it is set to 1. The _aggregation_ parameter allows you to pass the label of the aggregation to use (deafult is 'avg', i.e. average).
- `kmstart(tag)`: Set the Kaplan-Meier chart start even to be the event pointed to by the filtercard tag passed.

**Building and submitting the request**

- `buildJson()`: Return a JSOn representation of the full request (currently, this is what we put on the request body)
- `submit(hanaRequqest, urlPath, parameters)`: Submit the request over HTTP to the specified URL using the a HanaRequest instance (_lib/hand_request.js_), with the given parameters (those used by HanaRequest).

Here is an example of a complex request:

```javascript
var requestBuilder = new RequestBuilder(configMetaData, mriConfig)
requestBuilder
  .request()
  .matchall()
  .basicdata()
  .attribute('gender', { op: '=', value: 'm' })
  .filtercard('vStatus')
  .attribute('status', { op: '=', value: 'Alive' })
  .filtercard('priDiag', 'priDiag1')
  .filtercard('chemo', 'chemo1')
  .absolutetime({
    and: [
      { op: '>=', value: '20100101', type: 'abstime' },
      { op: '<=', value: '20101231', type: 'abstime' }
    ]
  })
  .filtercard('chemo')
  .exclude()
  .attribute('chemo_prot', { op: '=', value: 'FOLFOX' })
  .relativetime('isSucceededBy', 'priDiag1', 'chemo1', {
    and: [
      { op: '>=', value: 10 },
      { op: '<', value: 100 }
    ]
  })
  .matchany()
  .filtercard('chemo')
  .attribute('chemo_ops', { op: '=', value: '8-544' })
  .filtercard('surgery')
  .attribute('surgery_ops', { op: '=', value: '5-451' })
  .chart()
  .xaxis('priDiag1', 'icd_10', 1)
  .yaxis('basicdata', 'pcount', 1, 'min')

requestBuilder.submit(
  hanaRequest,
  '/analytics-svc/pa/services/analytics.xsjs',
  { action: 'aggquery' },
  function (err, response, body) {
    console.log(body)
  }
)
```

## Using the result parser API

The result parser (_lib/mri_result_parser.js_) allows you inspect the result returned from a request to the MRI (analytic) backend (the kind you can build with the request builder) without knowing the details of the return format. Like the request and patients build, it offers a fluent API (i.e. method chaining). Notice, however, that unlike the two builders, the methods on the result parser which themselves return a result parser return a new and independent parser, not just a modified copy. This allows you to reuse parsers when probing different parts of a result.

### General concepts

The two basic concepts the parser API uses mirrors those of MRI: _categories_ (categories into which the result is grouped, e.g. entries on the x-axis in the bar chart) and _measures_ (values in the categories, e.g. the y-value in the bar chart of the values for the columns in the patient list). We view the returned results as a tree in which each layer of nodes corresponds to one category, each node in a layer corresponds to a specific value for the corresponding category, and each leaf correspond to the measure values of the data point specified by the category values encountered when navigating from the root to this leaf. The result parser API makes it possible to navigate this tree layer-by-layer, to retrieve the values in one layer, and to retrieve the measures in a given leaf. When moving to a new layer by fixing the category value in the currently first layer, we get a new result parser back which contains only the subset of results corresponding to this choice (e.g. we focus on the data corresponding to a particular value on the x1 axis). We can then ask for the category values in the first layer of this new parser (i.e. the next layer for which we have no yet specified a value). If we have reached a leaf, we can retrieve the corresponding measure values. (This is properly best explained by examples - see below).

### API

A result parser is created factory functions,- i.e. you cannot directly access the constructor).

- `createMriResultParser(response, body)`: Create a MRI result parser instance for parsing the returned HTTP response and HTTP response body _after first checking the response_ (valid HTTP response, data non-empty etc.). This should be the default factory to use whenever you expect the return result to be valid and non-empty.
- `createNonValidatedMriResultParser(response, body)`: Similar to `createMriResultParser(response, body)` but without the added checks. Use this if you expect the response to be invalid (or otherwise indicate an error) or if you expect no data to be returned.

On the returned result parser instance, the following methods are available:

- `selectCategory(categoryValue)`: Returns a parser for the subset of results for which the value of the current first category is equal to the passed value.
- `getCategoryCount()`: Returns the number of categories
- `getDataPointCount()`: Returns the total number of data point in the response.
- `getCategoryValues()`: Returns the values for the current first (lowest) category in the response. Combined with `selectCategory()`, this allows you to retrieve the category values for any category.
- `getMeasureValues()`: Retrieves the measures stored in a given leaf from a parser representing just that leaf (i.e. you must navigate to a single leaf using one call to `selectCategory()` for each category first).
- `getCategoryMeasurePairs()`: Retrieve an array containing the (category value, measure value) pair when there is just one category inthe parser (i.e. you must call `selectCategory()` all categories except the last). Each pair is formatted as an array with the first entrx being the category value and the second entry being an array of the associated measure values in the correct order (cf. `getMeasureValues()`).

The following additional functions are also available, but only make sense if you created the result parser using `createNonValidatedMriResultParser` (they will always return false if you created the parser using the validating factory function):

- `isValid()`: Returns true if the HTTP response indicates success (as indicated by the status code).
- `isEmpty()`: Returns true if the HTTP response contained no data.
- `hasNoMatchingPatients()`: Returns true if the response explicitly indicated that there were no matching patient (but the appropriate flag, not just by being empty).

### Examples

```javascript
/* We add make a request with 3 categories (gender, smoker and ICD code) - and 2 measures specified
 */
requestBuilder.submit(
  aliceHanaRequest,
  ANALYTICS_URL,
  {
    action: 'aggquery'
  },
  function (err, response, body) {
    var resultParser = mriResultParser.createNonValidatedMriResultParser(response, body)
    // Check that response is valid
    expect(resultParser.isValid()).to.be.true
    // Check no. of categories in result
    expect(resultParser.CategoryCount()).to.equal(3)
    // Check the values returned for the first category
    expect(resultParser.getCategoryValues().sort()).to.eql(['F', 'M'])
    // Now navigate down two categories by choosing the male smokers
    var maleSmokerResultParser = resultParser.selectCategory('M').selectCategory('Yes')
    /* The above statement creates and new parser and does not touch the old one,
		so this is still true */
    expect(resultParser.CategoryCount()).to.equal(3)
    // Only ICD code left in new parser
    expect(maleSmokerResultParser.CategoryCount()).to.equal(1)
    // Check all pairs of ICD code and measures
    expect(resultParser.getCategoryMeasurePairs()).to.eql([
      ['C60', [1, 3]],
      ['C70', [2, 4]]
    ])
    // Targeted check of the measures for ICD code C70
    expect(resultParser.selectCategory('C70').getMeasureValuePairs()).to.eql([2, 4])
    done()
  }
)
```

## Passing parameters on the command-line

The default configuration used when running the test suite is stored in the file _environment.json_ inside the _specs_ folder. This includes all the pre-set Mocha options (parameters starting with _mocha-_). All parameters in this file can be overwritten by using the double-dash command line options with the same name when running the _run_specs.js_ script (property "xyz" <--> command-line option "--xyz"). Thus, to change the property "host" to _<analytics-svc-server>_, you would do as follows:

```
node run_specs.js --host <analytics-svc-server>
```

For binary fields (e.g. _log_), setting the flag without parameters sets the parameter to true, while leaving it out is interpreted as false, so these parameters are always overwritten.

All parameters that can be passed to Mocha can be used by appending _mocha-_ to the Mocha options name. E.g. if I set `--mocha-timeout 5000` on the command line, this will mean that the framework internally passes `--timeout 5000` to Mocha. One useful application to this is to be able to set the suite to output XUnit-style XML:

```
JUNIT_REPORT_PATH=./output.xml node run_specs.js --host test-machineX --instance_no 0 --mocha-reporter mocha-jenkins-reporter
```

Internally, the overwriting of default parameters is handled by writing the modified configuration to a file called _.envir_ that is then read by the test files.

## Custom npm commands

A few handy commands have been added to _package.json_ so you can run them directly via npm:

- `npm test`: Run mocha unit test for the frameworkoid itself
- `npm run test_xml_output`: Run the mocha unit tests for the frameworkoid itself with XML (XUnit) output
- `npm run watch`: Activate Mocha watch so that the unit tests are run on every save
- `npm run lint`: Run ESlint on the frameworkoid
- `npm run jsdoc`: Generate JSDoc from the frameworkoid (stored in _jsdoc_ folder)
