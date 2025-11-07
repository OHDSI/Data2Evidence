/* global sinon throws */
sap.ui.require([
    "sap/hc/mri/pa/ui/lib/ifr/SimpleVisitors",
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/lib/ifr/BooleanContainers"
], function (SimpleVisitors, IRF, BooleanContainers) {
    "use strict";

    QUnit.module("SimpleVisitors Tests");

    QUnit.test("Visitors throw if invalid methods are called", function () {
        QUnit.expect(12);

        var fVisitor = new SimpleVisitors.FilterVisitor();
        assertAllVisitorMethodsThrow(fVisitor, [fVisitor.visitFilterCard, fVisitor.visitAttribute, fVisitor.visitExpression]);

        var fcVisitor = new SimpleVisitors.FilterCardVisitor();
        assertAllVisitorMethodsThrow(fcVisitor, [fcVisitor.visitFilter, fcVisitor.visitAttribute, fcVisitor.visitExpression]);

        var aVisitor = new SimpleVisitors.AttributeVisitor();
        assertAllVisitorMethodsThrow(aVisitor, [aVisitor.visitFilter, aVisitor.visitFilterCard, aVisitor.visitExpression]);

        var eVisitor = new SimpleVisitors.ExpressionVisitor();
        assertAllVisitorMethodsThrow(eVisitor, [eVisitor.visitFilter, eVisitor.visitFilterCard, eVisitor.visitAttribute]);

        function assertAllVisitorMethodsThrow(visitor, methodList) {
            methodList.forEach(function (method) {
                assertVisitorMethodThrows(visitor, method);
            });
        }

        function assertVisitorMethodThrows(visitor, method) {
            throws(function () {
                method.apply(visitor);
            }, SimpleVisitors.IllegalStateException);
        }
    });

    QUnit.test("Visitors calls boolean container callbacks", function () {
        QUnit.expect(1);

        var andContainer = new BooleanContainers.And([]);
        var orContainer = new BooleanContainers.Or([]);
        var notContainer = new BooleanContainers.Not([]);

        var api = {
            onVisitAndStart: function () { /* intentionally empty */ },
            onVisitAndEnd: function () { /* intentionally empty */ },
            onVisitOrStart: function () { /* intentionally empty */ },
            onVisitOrEnd: function () { /* intentionally empty */ },
            onVisitNotStart: function () { /* intentionally empty */ },
            onVisitNotEnd: function () { /* intentionally empty */ }
        };

        var mock = sinon.mock(api);

        mock.expects("onVisitAndStart").once();
        mock.expects("onVisitAndEnd").once();
        mock.expects("onVisitOrStart").once();
        mock.expects("onVisitOrEnd").once();
        mock.expects("onVisitNotStart").once();
        mock.expects("onVisitNotEnd").once();


        var v = new SimpleVisitors.FilterVisitor(api);

        andContainer.accept(v);
        orContainer.accept(v);
        notContainer.accept(v);

        mock.verify();
    });
});
