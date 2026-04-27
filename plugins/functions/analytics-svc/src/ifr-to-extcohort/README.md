# IFR Bookmark to Extension Cohort Definition Transformer

This transformer is meant to be a one way transformation to allow exporting of an Extension compatible cohort definition from IFR Patient Analytic's bookmark (i.e. filters).

IFR Bookmarks have a simpler format which allow mapping from IFR > Extension cohort, but not the other way round.

## Capabilities

Implemented

-   Below only applies for "Inclusion" section of bookmark
-   Basic data > Demography
-   Concept > Concept Sets
    -   requires updating `sample-concepts.ts` and `cdm-config-with-ohdsi-mapping.ts`
-   Multiple IFR Bookmark AND and OR filtercards
-   Partial handling of attribute types (`time` and `num`)

Unimplemented

-   Exclusion section
    -   As Atlas does not support exclusions, workaround of including the inverse of the filtercard will be required
-   Advanced Time
-   Attribute types `datetime` and `text`

## Getting bookmark value

-   In Patient Analytics, go to the barcharts page.
-   Look for a url like `https://alp-dev.org/analytics-svc/api/services/population/json/barchart?mriquery=eJy1VF1v2kAQ/CvVPdsp/iBg3hwILVLzIaB5iSq0vluTU80Z2WsUN+K/Z8+hJglIpJH6YtlzM7vjvbl7EqnOCAsxeBIyN6leXiGBAgKLaCUGIvJVT56nfTfwvL4b+t1zFxLfd1M/7aXKi1SIPeGIDRalzg0LYrF1hIRClbuqhIbE4P7gnbvdAj2wZA2k7YIjtCkJjMTrapVYW509NBm9YRpYIQMXUGr5ZWQdWypI0hvGU8hKdATVa0saNz85ZE9MAqJCJxXhMX8Hns729LN4ieK4n0PWrnP8F2eIy5dUgDb0rvOvln6R5xmCGfIS83gAjsjXjN9MxXbrnHb4DY1qVKdMtsT/4PM0Lb4e2ZCA2liPc73C8S6GpsqyDxSwfT7cpswLdi+uppPFbbwYfo+n88Xshh+jy3H888e8yesDFDR/KceTk7+xicqjLmeYIYfKRpsj0o5wYs+G+WpTl/Cw9R9svyUQLvOibiiPnrAb9+86/5O64JO68IjuSHDWMq+a8/dGXXvNfqxeXR7thRDYLWiGiGpGlaovDWmq7yCrrJdeJ5Bd1QcXPBW5oQp9FwIvdLtJBKC6XhBEHbF9Br1qjks=`.
-   Copy the param value of `mriquery=`.
-   Ensure you are on `node 18`.
-   Run `yarn workspace @alp/alp-base-utils run compile`.
-   Replace `encodedStr` in `decodeMriquery.ts` with the param value.
-   Run `ts-node decodeMriquery.ts` and it will print the JSON value to console.

## Getting the Extension cohort value

-   Go to public instance.
-   On the left, click "Cohort Definitions" tab.
-   Go to the "Export" tab.
-   Select "JSON".
-   Click "Copy to clipboard"

## Run tests

-   run tests with `yarn testci ifr-to-extcohort --watch`
