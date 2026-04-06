# MRI Request Builder

```
var requestBuilder = new RequestBuilder(comfig, ['vStatus'], 'acme');
requestBuilder.request()
                .matchall()
                    .basicdata()
                        .attribute('gender', {"op": "=", "value": "m"})
                        .attribute('pcount')
                            .yaxis(1)
                    .filtercard('vStatus')
                        .attribute('status', {"op": "=", "value": "Alive"})
                    .filtercard('priDiag', 'priDiag1')
                        .attribute('icd_10')
                            .xaxis(1)
                    .filtercard('chemo', 'chemo1')
                        .absolutetime({
                            "and": [
                                {"op": ">=", "value": "20100101", "type": "abstime"},
                                {"op": "<=", "value": "20101231", "type": "abstime"}
                                ]})
                    .filtercard('chemo')
                        .exclude()
                        .attribute('chemo_prot', {"op": "=", "value": "FOLFOX"})
                    .relativetime('isSucceededBy', 'priDiag1', 'chemo1',{
                        "and": [
                                {"op": ">=", "value": 10},
                                {"op": "<", "value": 100}
                            ]})
                .matchany()
                    .filtercard('chemo')
                        .attribute('chemo_ops', {"op": "=", "value": "8-544"})
                    .filtercard('surgery')
                        .attribute('surgery_ops', {"op": "=", "value": "5-451"});
requestBuilder.submit(hanaRequest, '/analytics-svc/pa/services/analytics.xsjs', {action: 'aggquery'}, function(err, response, body){
    console.log(body);
});
```

# Patient Summary Request Builder

```
    Example 1 (specific interactions for patient):
        requestBuilder.request('abc')
            .masterData()
            .interaction('patient.interactions.vStatus')
            .interaction('patient.conditions.acme.interactions.priDiag');

    Example 2 (all configured interactions for patient):
        requestBuilder.request('abc')
            .masterData();


    request.submit(testUserSession, 'alp/hc/hph/patient/app/services/patientservice.xsjs', function(err, response, body){
        // do something
    });
```

# Patient Summary Result Parser

```
    rP = new ResultParser(result);

    Example 1 (get master data attributes in result):
        rP.selectMasterData().getAttributes();
            => [ 'pid', 'firstName', 'lastName', 'street', 'city', 'zipcode', 'region', 'dateOfBirth', 'dateOfDeath' ]

    Example 2 (get a list of all interaction types):
        rP.getInteractionTypes();
            => ['patient.conditions.acme.interactions.priDiag',
                'patient.interactions.vStatus',
                'patient.conditions.acme.interactions.tnm',
                'patient.interactions.ga_sample',
                'patient.conditions.acme.interactions.biobank',
                'patient.conditions.acme.interactions.surgery',
                'patient.conditions.acme.interactions.radio',
                'patient.conditions.acme.interactions.chemo' ]

    Example 3 (get a single instance of an interaction):
        rP.selectInteractionType("patient.conditions.acme.interactions.chemo").selectInteraction(0);
            => ResultParser (filtered on chemo 0)

    Example 4 (get attributes for an interaction):
        var interaction = <See Example 4>;
        interaction.getValues('chemo_prot');            => ['Cytoxan']

    Example 5 (get count of returned interactions of certain type):
        rP.selectInteractionType("patient.conditions.acme.interactions.chemo").countInteractions();
            => 3


    Example 6 (counting of entities)
        V1:
            var rP = new ResultParser(result);

        console.log('\n--- All Interactions ---');
            console.log('Interaction Types:',rP.countInteractionTypes());
            console.log('Interactions:',rP.countInteractions());
            console.log('Attributes:',rP.countAttributes());

        console.log('\n--- All Chemo Interactions ---');
            var rP_Chemo = rP.selectInteractionType("patient.conditions.acme.interactions.chemo");
            console.log('Interaction Types:',rP_Chemo.countInteractionTypes());
            console.log('Interactions:',rP_Chemo.countInteractions());
            console.log('Attributes:',rP_Chemo.countAttributes());

        console.log('\n--- Single Chemo Interaction ---');
            var rP_Chemo_0 = rP_Chemo.selectInteraction(0);
            console.log('Interaction Types:',rP_Chemo_0.countInteractionTypes());
            console.log('Interactions:',rP_Chemo_0.countInteractions());
            console.log('Attributes:',rP_Chemo_0.countAttributes());

        console.log('\n--- All Radio Interactions ---');
            var rP_Radio = rP.selectInteractionType("patient.conditions.acme.interactions.radio");
            console.log('Interaction Types:',rP_Radio.countInteractionTypes());
            console.log('Interactions:',rP_Radio.countInteractions());
            console.log('Attributes:',rP_Radio.countAttributes());

        console.log('\n--- All Master Data attributes---');
            var rP_master = rP.selectMasterData();
            console.log('Interaction Types:',rP_master.countInteractionTypes());
            console.log('Interactions:',rP_master.countInteractions());
            console.log('Attributes:',rP_master.countAttributes());
        =>
            --- All Interactions ---
            Interaction Types: 8
            Interactions: 8
            Attributes: 43

            --- All Chemo Interactions ---
            Interaction Types: 1
            Interactions: 3
            Attributes: 12

            --- Single Chemo Interaction ---
            Interaction Types: 1
            Interactions: 1
            Attributes: 4

            --- All Radio Interactions ---
            Interaction Types: 1
            Interactions: 1
            Attributes: 3

            --- All Master Data attributes---
            Interaction Types: 0 *
            Interactions: 0 *
            Attributes: 9

        * at this point in time the request parser is not aware of the interactions/interaction types anymore.
```
