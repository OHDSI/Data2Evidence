
export class AssignmentProxy {

    private assignment: any[];

    constructor(_assignment: any[]) {
        this.assignment = _assignment;
    }

    public hasConfigAssigned(settings: any, cb) {
        let result = this.assignment.length > 0 ? true : false;
        cb(null, result);
        return result;
    }

    public  getAssignedConfigs(type: any, cb) {
        cb(null, this.assignment);
        return this.assignment;
    }


};
