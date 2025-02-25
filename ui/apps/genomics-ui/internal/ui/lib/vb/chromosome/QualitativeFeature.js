jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.QualitativeFeature');
sap.ui.base.ManagedObject.extend('hc.hph.genomics.ui.lib.vb.chromosome.QualitativeFeature', {
    metadata: {
        properties: {
            color: {
                type: 'string',
                defaultValue: '#363E43'
            },
            icon: {
                type: 'string',
                defaultValue: ''
            },
            featureClass: {
                type: 'string',
                defaultValue: ''
            },
            featureValue: {
                type: 'string',
                defaultValue: ''
            }
        }
    }
});