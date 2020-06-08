export class TemplateModule {
    name: string;

    functionId?: number;
    listInputs:TemplatePort[]=[];
    listOutputs:TemplatePort[]=[];
    constructor(name:  string){
        this.name=name;
    }
}
export class TemplatePort {
    isInput: boolean;
    varType: string;
    varName: string;


    constructor(isInput: boolean, varType: string, varName: string){
        this.isInput = isInput;
        this.varType = varType;
        this.varName = varName; 
    }
}