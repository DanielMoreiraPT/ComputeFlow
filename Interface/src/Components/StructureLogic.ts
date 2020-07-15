export class Connection {
    id:string;  //ex: connection1
    parentPort: Port;
    parentPortInput:boolean;
    parentNode: Module;
    curve?: string | undefined;

    endPointX?: number;
    endPointY?: number;

    externalNode?: Module;
    externalPort?: Port;


    constructor(id: string, parentPort: Port, parentPortInput: boolean, parentNode: Module){
        this.id=id;
        this.parentPort=parentPort;
        this.parentNode=parentNode;
        this.parentPortInput=parentPortInput;
    }   
    setEndPoints( endPointX: number, endPointY: number){
        this.endPointX=endPointX;
        this.endPointY=endPointY;
    }

    setConnectedPort(externalPort: Port, externalNode: Module){
        this.externalPort=externalPort;
        this.externalNode=externalNode;
        this.endPointX=externalPort.xPos;
        this.endPointY=externalPort.yPos;
        
    }

    calculateCurve(){
        let dEndX: number;
        let dEndY: number;
        if(this.externalPort === undefined){
            if(this.endPointX !== undefined && this.endPointY !== undefined ){
                dEndX = this.endPointX;
                dEndY = this.endPointY;
            }else{
                console.error("End point for connection does not exist");
                return;
            }
        }else{
            dEndX = this.externalPort.getXPos();
            dEndY = this.externalPort.getYPos();
        }
        //initialize vars
        let dX = this.parentPort.getXPos();
        let dY = this.parentPort.getYPos();
        

        //mid-point of line
        let mpX = (dX + dEndX)*0.5;
        let mpY = (dY + dEndY)*0.5;

        // angle of perpendicular to line:
        var theta = Math.atan2(dEndY - dY, dEndX - dX) - Math.PI / 2;
        // distance of control point from mid-point of line:
        var offset = 100;
        
        // location of control point:
        var c1x = mpX + offset * Math.cos(theta);
        var c1y = mpY + offset * Math.sin(theta);
        this.curve = `M${dX} ${dY} Q${c1x} ${c1y} ${dEndX} ${dEndY}`;
        //console.log(curve)
        
    }

}
export class Port {
    isInput: boolean;
    varType: string;
    varName: string;
    xPos: number = 0;
    yPos: number = 0;

    id: number = 0;

    //default -> 7.5 raio externo
    //default -> 5 raio interno
    hiboxSize: number = 7.5;

    //TODO and think
    //add parent -> may be helpful down the road
    //still checking if i need this below
    Connections ?: [{ InitialX: number, InitialY: number, FinalX: number, FinalY: number, ConnectedPort?:Port | undefined}];

    constructor(isInput: boolean, varType: string, varName: string){
        this.isInput = isInput;
        this.varType = varType;
        this.varName = varName; 
    }

    knowIfIsInput(){
        return this.isInput;
    }
    getVarType(){
        return this.varType;
    }
    getVarName(){
        return this.varName;
    }
    getXPos(){
        return this.xPos;
    }
    getYPos(){
        return this.yPos;
    }
    setXPos(xPos: number){
        this.xPos=xPos;
    }
    setYPos(yPos: number){
        this.yPos=yPos;
    }
    setId(id: number){
        this.id=id;
    }
}
export class Module {
    id: number;
    name: string;
    //TODO
    //default
    functionId: number = 0;

    xPos: number;
    yPos: number;
    
    moduleWidth?: number;
    moduleHeight?: number;
    headerHeight?: number;
    contentHeight?: number;
    inputList: Port[]=[];
    outputList: Port[]=[];
    connectionsInputs: {InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection:Connection}[];
    connectionsOutputs: {InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection:Connection}[];
    listVariables?;

    constructor(id: number, name: string, xPos: number,yPos: number) {
        this.id = id;
        this.name = name;
        this.xPos = xPos;
        this.yPos = yPos;
        this.connectionsInputs =[];
        this.connectionsOutputs =[];
    }
    addFunctionId(id: number){
        this.functionId=id;
    }
    addInputs(inputList){
        this.inputList = inputList;
    }
    addOutputs(outputList){
        this.outputList = outputList;
    }
    getId() {
        return this.id;
    }
    getName() {
        return this.name;
    }
    getInputList() {
        if( this.inputList ){
            return this.inputList;
        }else{
            return "";
        }
    }
    getOutputList() {
        if( this.outputList ){
            return this.outputList;
        }else{
            return "";
        }
    }
    getXPos() {
        return this.xPos;
    }
    getYPos() {
        return this.yPos;
    } 
    setXPos(xPos: number){
        this.xPos=xPos;
    }
    setYPos(yPos: number){
        this.yPos=yPos;
    }
    setModuleWidth(){
        //default
        this.moduleWidth = 200;
        let titleSize: number = this.name.length*14;
        let maxInputlength: number = 0; //size of the bigger input (characters size)
        for(let input of this.inputList){
            let varTypeSize = input.getVarType().length;
            let varTypeName = input.getVarName().length;

            if(varTypeSize+varTypeName > maxInputlength){
                maxInputlength=varTypeSize+varTypeName;
            }
        }
        let maxOutputlength: number = 0; //size of the bigger output (characters size)
        for(let output of this.outputList){
            let varTypeSize = output.getVarType().length;
            let varTypeName = output.getVarName().length;

            if(varTypeSize+varTypeName > maxOutputlength){
                maxOutputlength=varTypeSize+varTypeName;
            }
        }

        let newWidthValue: number = (maxInputlength+maxOutputlength)*8+50 ;
        if(newWidthValue > this.moduleWidth){
            this.moduleWidth=newWidthValue; 
        }
        if(titleSize>this.moduleWidth){
            this.moduleWidth=titleSize;
        }
    }
    setModuleHeight(){
        if(this.headerHeight === undefined){
            this.headerHeight=40;
        }
        this.moduleHeight=this.headerHeight;

        let maxNumberOfInputs: number = this.inputList.length; //ammount of inputs
        let maxNumberOfOutputs: number = this.outputList.length; //ammount of outputs
        let maxNumberOfPorts: number;
        if(maxNumberOfInputs > maxNumberOfOutputs){
            maxNumberOfPorts=maxNumberOfInputs;
        }else{
            maxNumberOfPorts=maxNumberOfOutputs;
        }

        this.contentHeight = (maxNumberOfPorts)*30;
        this.moduleHeight += this.contentHeight;

    }
    setPortCoords(){
        let portNumber: number = 0;
        for(let input of this.inputList){
            input.setXPos(this.xPos + 15);
            input.setYPos(this.yPos + 50+(25*portNumber) + 10);
            portNumber+=1;
        }
        portNumber = 0;
        for(let output of this.outputList){
            if(this.moduleWidth === undefined){
                this.setModuleWidth();
            }
            if(this.moduleWidth !== undefined){  //so pq tava a dar erro a dzr que this.moduleWidth n tava definido
                output.setXPos(this.xPos +this.moduleWidth-11);
                output.setYPos(this.yPos + 50+(25*portNumber) + 10); //ypos -> posicao do modulo + 50 -> header e espaco  + 25*portNumber -> separacao entre cada port + 10 -> para ficar no centro do circulo +-
                portNumber+=1;
            }
        }
    }
    addInputConnection(InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection){
        if( this.connectionsInputs===undefined){
            this.connectionsInputs=[{InternalPort, ExternalPort, ExternalNode, Connection}];
        }else{
            this.connectionsInputs.push({InternalPort, ExternalPort, ExternalNode, Connection});
        }
    }
    addOutputConnection(InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection){
        if( this.connectionsOutputs==undefined){
            this.connectionsOutputs=[{InternalPort, ExternalPort, ExternalNode, Connection}];
        }else{
            this.connectionsOutputs.push({InternalPort, ExternalPort, ExternalNode, Connection});
        }
    }
    getModuleWidth(){
        return this.moduleWidth;
    }
    getModuleHeight(){
        return this.moduleHeight;
    }
    getContentHeight(){
        return this.contentHeight;
    }
    adjustBackgroundMovement(_dx: number, _dy: number){
        this.xPos += _dx;
        this.yPos += _dy;
    }
    adjustOwnProperties(){
        this.setModuleHeight();
        this.setModuleWidth();
        this.setPortCoords();
    }

    




}
export class Chart {
    ProjectName: string;
    ModuleList: Module[]=[];
    FinalConnections: Connection[]=[];

    //default
    nextModuleID: number=0;

    constructor(ProjectName: string){
        this.ProjectName=ProjectName;
    }

    addModule(ModuletoInsert: Module){
        this.ModuleList.push(ModuletoInsert);
        this.ModuleList=this.ModuleList;
    }
    addFinalConnection(ConnectiontoInsert: Connection){
        this.FinalConnections.push(ConnectiontoInsert);
        this.FinalConnections=this.FinalConnections;
    }

    //TODO to JSON & others
    
    findIdealModuleId(idStart:number){
        let possible: Boolean = true;
        if(this.ModuleList.length==0){this.nextModuleID= 0;}

        for(let moduleentry of this.ModuleList){
            if(idStart==moduleentry.id){
                possible=false;
                break;
            }
        }
        if(possible==false){
            this.findIdealModuleId(idStart+1);

        }else{
            this.nextModuleID = idStart;
        }
        
    }

    toJSON():string{
        var obj:any = {
            "title": this.ProjectName,
            "Modules": []
            }

        let i:number;
        if(this.ModuleList.length){
            for(i=0;i<this.ModuleList.length;i++){
                let module_obj:any = {
                    "Name":this.ModuleList[i].name,
                    "Id":i,
                    "Variables":{},
                    "Coord":{
                        "CoordX":this.ModuleList[i].xPos,
                        "CoordY":this.ModuleList[i].yPos
                    },
                    "FunctionID":this.ModuleList[i].functionId,
                    "IO":{
                    "Inputs":[
            
                    ],
                    "Outputs":[
            
                    ]
                    },
                    "Connections":{
                    "Inputs":[
                    ],
                    "Outputs":[
                    ]
                    }
                }
                if(this.ModuleList[i].listVariables){
                    module_obj["Variables"]=this.ModuleList[i].listVariables;
                }
                let j: number;
                for( j=0; j<this.ModuleList[i].inputList.length; j++){
                    let inputPortObj: any = {
                    "PortID":j,
                    "PortType":this.ModuleList[i].inputList[j].varType,
                    "VarName":this.ModuleList[i].inputList[j].varName
                    }
            
                    module_obj["IO"]["Inputs"].push(inputPortObj);
            
                    
                    
                    let connectionIndex: number; 
                    if(this.ModuleList[i].connectionsInputs !== undefined){
                       
                        for(connectionIndex=0; connectionIndex<this.ModuleList[i].connectionsInputs.length; connectionIndex++){
                            
                            if(this.ModuleList[i].connectionsInputs[connectionIndex].InternalPort.id == j){
                                let connectionObj: any = {
                                    "ModuleID":this.ModuleList[i].connectionsInputs[connectionIndex].ExternalNode.id,
                                    "ModulePort":this.ModuleList[i].connectionsInputs[connectionIndex].ExternalPort.id,
                                    "InputPort":j		
                                }
                                module_obj["Connections"]["Inputs"].push(connectionObj);
                            }
                        }
                    
                    }
                }

                for( j=0; j<this.ModuleList[i].outputList.length; j++){
                    let outputPortObj: any = {
                    "PortID":j,
                    "PortType":this.ModuleList[i].outputList[j].varType,
                    "VarName":this.ModuleList[i].outputList[j].varName
                    }
            
                    module_obj["IO"]["Outputs"].push(outputPortObj);
            
                    
                    
                    let connectionIndex: number; 
                    
                    
                    if(this.ModuleList[i].connectionsOutputs !== undefined){
                        for(connectionIndex=0; connectionIndex<this.ModuleList[i].connectionsOutputs.length; connectionIndex++){

                            if(this.ModuleList[i].connectionsOutputs[connectionIndex].InternalPort.id == j){
                                let connectionObj:any = {
                                    "ModuleID":this.ModuleList[i].connectionsOutputs[connectionIndex].ExternalNode.id,
                                    "ModulePort":this.ModuleList[i].connectionsOutputs[connectionIndex].ExternalPort.id,
                                    "OutputPort":j		
                                }
                                module_obj["Connections"]["Outputs"].push(connectionObj);
                            }
                            
                        
                        }
                    }
                    
                }
                obj["Modules"].push(module_obj);
            
                }
    
            }    
        var json = JSON.stringify(obj);
        return json;  
    
    }

    loadJSON(data: string):void{
        let json = JSON.parse(data);
        console.log(json);
        this.ModuleList=[];
        this.FinalConnections=[];
        for(let i=0; i<json.Modules.length; i++){
            let inputlist:Port[]=[];
            let outputlist:Port[]=[];
            for(let j=0; j<json.Modules[i].IO.Inputs.length; j++){
                let InputObject = new Port(true,json.Modules[i].IO.Inputs[j].PortType , json.Modules[i].IO.Inputs[j].VarName)
                inputlist.push(InputObject)
            }
            for(let h=0; h<json.Modules[i].IO.Outputs.length; h++){
                let OutputObject = new Port(false,json.Modules[i].IO.Outputs[h].PortType , json.Modules[i].IO.Outputs[h].VarName)
                outputlist.push(OutputObject)
            }

            let FlowModuleObject = new Module(json.Modules[i].Id, json.Modules[i].Name, json.Modules[i].Coord.CoordX, json.Modules[i].Coord.CoordY);
            FlowModuleObject.functionId=json.Modules[i].FunctionID;
            FlowModuleObject.addOutputs(outputlist)
            FlowModuleObject.addInputs(inputlist)
            FlowModuleObject.setModuleWidth();
            FlowModuleObject.setModuleHeight();
            FlowModuleObject.setPortCoords();
            
            if(json.Modules[i].Variables){
                FlowModuleObject.listVariables=json.Modules[i].Variables;
            }
            
            console.log(FlowModuleObject)
            this.addModule(FlowModuleObject); 
        }
        
        for(let i=0; i<json.Modules.length; i++){
            let inputConnectionslist=[];
            let outputConnectionslist=[];
            for(let j=0; j<json.Modules[i].Connections.Inputs.length; j++){
                //correto
                let InputObject : Port = this.ModuleList[i].inputList[json.Modules[i].Connections.Inputs[j].InputPort];
                let InputModule : Module = this.ModuleList[i];

                let OutputModule : Module = this.ModuleList[json.Modules[i].Connections.Inputs[j].ModuleID];
                let OutputObject : Port = OutputModule.outputList[json.Modules[i].Connections.Inputs[j].ModulePort];

                let connection = new Connection('connectionX', InputObject, true, InputModule);

                connection.setConnectedPort(OutputObject, OutputModule);

                connection.calculateCurve();
                
                InputModule.addInputConnection(InputObject, OutputObject, OutputModule ,connection);
                OutputModule.addOutputConnection(OutputObject, InputObject, InputModule ,connection);
                
                this.addFinalConnection(connection);
            }
        }
    }
}