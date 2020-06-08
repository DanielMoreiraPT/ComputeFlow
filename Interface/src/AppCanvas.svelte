<script lang="typescript">	
    import Canvas from './Canvas.svelte'
    import { Module, Port, Connection, Chart } from './StructureLogic';
    import Sidebar from './Sidebar.svelte';
    import Button from './Button.svelte';
    import {addModule, removeModule} from './ChartInteraction';
    import { createEventDispatcher} from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    var fs = require('fs');
    var dir = '../MyFlowProjects';

  
    let ChartStruc: Chart = new Chart("New Project");

    //need to initialize vars -> it would not work if after loaded, the diagram was not moved
    let Background_dxInitial: number = -3000;
    let Background_dyInitial: number = -3000;
    //positions where a module may "spawn"
    let Background_dx: number;
    let Background_dy: number;
    let SpawnX: number=-Background_dxInitial+600;
    let SpawnY: number=-Background_dxInitial+600;

    //done
    const handleBackGroundMovement = (e) => {
        Background_dx = e.detail.Background_dx.Background_dx;
        Background_dy = e.detail.Background_dy.Background_dy;
        SpawnX = -Background_dx+600;
        SpawnY = -Background_dy+600;
    }
    //done
    function saveToFile(ProjectName:string, chart: Chart){
        var obj = {
        "title":chart.ProjectName,
        "Modules":[

        ]
        }


        let i:number;
        if(chart.ModuleList.length){
        for(i=0;i<chart.ModuleList.length;i++){
            let module_obj = {
                "Name":chart.ModuleList[i].name,
                "Id":i,
                "Coord":{
                    "CoordX":chart.ModuleList[i].xPos,
                    "CoordY":chart.ModuleList[i].yPos
                },
                "FunctionID":chart.ModuleList[i].functionId,
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
            let j: number;
            for( j=0; j<chart.ModuleList[i].inputList.length; j++){
                let inputPortObj = {
                "PortID":j,
                "PortType":chart.ModuleList[i].inputList[j].varType,
                "VarName":chart.ModuleList[i].inputList[j].varName
                }
        
                module_obj["IO"]["Inputs"].push(inputPortObj);
        
                
                
                let connectionIndex: number; 
                if(chart.ModuleList[i].connectionsInputs !== undefined){
                    for(connectionIndex=0; connectionIndex<chart.ModuleList[i].connectionsInputs.length; connectionIndex++){
                        if(chart.ModuleList[i].connectionsInputs[connectionIndex].InternalPort.id == j){
                            let connectionObj = {
                                "ModuleID":chart.ModuleList[i].connectionsInputs[connectionIndex].ExternalNode.id,
                                "ModulePort":chart.ModuleList[i].connectionsInputs[connectionIndex].ExternalPort.id,
                                "InputPort":j		
                            }
                            module_obj["Connections"]["Inputs"].push(connectionObj);
                        }
                        
                    
                    }
                }
                /*
                if(chart.ModuleList[i].connectionsOutputs !== undefined){
                    for(connectionIndex=0; connectionIndex<chart.ModuleList[i].connectionsOutputs.length; connectionIndex++){

                        if(chart.ModuleList[i].connectionsOutputs[connectionIndex].InternalPort.id == j){
                            let connectionObj = {
                                "ModuleID":chart.ModuleList[i].connectionsOutputs[connectionIndex].ExternalNode.id,
                                "ModulePort":chart.ModuleList[i].connectionsOutputs[connectionIndex].ExternalPort.id,
                                "OutputPort":j		
                            }
                            module_obj["Connections"]["Outputs"].push(connectionObj);
                        }
                        
                    
                    }
                }
                */
            }

            for( j=0; j<chart.ModuleList[i].outputList.length; j++){
                let outputPortObj = {
                "PortID":j,
                "PortType":chart.ModuleList[i].outputList[j].varType,
                "VarName":chart.ModuleList[i].outputList[j].varName
                }
        
                module_obj["IO"]["Outputs"].push(outputPortObj);
        
                
                
                let connectionIndex: number; 
                /*
                if(chart.ModuleList[i].connectionsInputs !== undefined){
                    for(connectionIndex=0; connectionIndex<chart.ModuleList[i].connectionsInputs.length; connectionIndex++){
                        if(chart.ModuleList[i].connectionsInputs[connectionIndex].InternalPort.id == j){
                            let connectionObj = {
                                "ModuleID":chart.ModuleList[i].connectionsInputs[connectionIndex].ExternalNode.id,
                                "ModulePort":chart.ModuleList[i].connectionsInputs[connectionIndex].ExternalPort.id,
                                "InputPort":j		
                            }
                            module_obj["Connections"]["Inputs"].push(connectionObj);
                        }
                        
                    
                    }
                }*/
                
                if(chart.ModuleList[i].connectionsOutputs !== undefined){
                    for(connectionIndex=0; connectionIndex<chart.ModuleList[i].connectionsOutputs.length; connectionIndex++){

                        if(chart.ModuleList[i].connectionsOutputs[connectionIndex].InternalPort.id == j){
                            let connectionObj = {
                                "ModuleID":chart.ModuleList[i].connectionsOutputs[connectionIndex].ExternalNode.id,
                                "ModulePort":chart.ModuleList[i].connectionsOutputs[connectionIndex].ExternalPort.id,
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
        
        //create directory with files
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        
        fs.writeFile('../MyFlowProjects/'+ProjectName+'.json', json, (err) => {
                if(err){
                    alert("An error ocurred creating the file ")
                    //alert("An error ocurred creating the file "+ err.message)
                }else{
                    alert("The file has been succesfully saved");
                    //add to the side bar to load projects
                    dispatch('fileWasSaved', {
                        fileSaved: {ProjectName}
                    });
                    
                }
                            
            });
    }
    //done
    export function loadFile(ProjectName: string){
        
        var path = require('path');  

        var filePath = path.join(dir, ProjectName+'.json');
        ChartStruc= new Chart(ProjectName);
        fs.readFile(filePath, function(err,data){
            if (!err) {
                let json = JSON.parse(data);
                let ModulesList=[];
                //console.log(json)
                for(let i=0; i<json.Modules.length; i++){
                    
                    let inputlist=[];
                    let outputlist=[];
                    for(let j=0; j<json.Modules[i].IO.Inputs.length; j++){
                        let InputObject = new Port(true,json.Modules[i].IO.Inputs[j].PortType , json.Modules[i].IO.Inputs[j].VarName)
                        inputlist.push(InputObject)
                    }
                    for(let h=0; h<json.Modules[i].IO.Outputs.length; h++){
                        let OutputObject = new Port(false,json.Modules[i].IO.Outputs[h].PortType , json.Modules[i].IO.Outputs[h].VarName)
                        outputlist.push(OutputObject)
                    }

                    let FlowModuleObject = new Module(json.Modules[i].Id, json.Modules[i].Name, json.Modules[i].Coord.CoordX,  json.Modules[i].Coord.CoordY);
                    FlowModuleObject.functionId=json.Modules[i].FunctionID;
                    FlowModuleObject.addOutputs(outputlist)
                    FlowModuleObject.addInputs(inputlist)
                    FlowModuleObject.setModuleWidth();
                    FlowModuleObject.setModuleHeight();
                    FlowModuleObject.setPortCoords();
                    ModulesList.push(FlowModuleObject);

                    ChartStruc.addModule(FlowModuleObject); 

                }
                for(let i=0; i<json.Modules.length; i++){
                    let inputConnectionslist=[];
                    let outputConnectionslist=[];
                    for(let j=0; j<json.Modules[i].Connections.Inputs.length; j++){
                        //correto
                        let InputObject : Port = ModulesList[i].inputList[json.Modules[i].Connections.Inputs[j].InputPort];
                        let InputModule : Module = ModulesList[i];

                        let OutputModule : Module = ModulesList[json.Modules[i].Connections.Inputs[j].ModuleID];
                        let OutputObject : Port = OutputModule.outputList[json.Modules[i].Connections.Inputs[j].ModulePort];

                        let connection = new Connection('connectionX', InputObject, true, InputModule);

                        connection.setConnectedPort(OutputObject, OutputModule);

                        connection.calculateCurve();
                        
                        InputModule.addInputConnection(InputObject, OutputObject, OutputModule ,connection);
                        OutputModule.addOutputConnection(OutputObject, InputObject, InputModule ,connection);
                        
                        ChartStruc.addFinalConnection(connection);
                    }
                    
                }
                ChartStruc=ChartStruc;

                dispatch('updateActiveProjectNameAndState', {
                            projectName: {ProjectName},
                            state: {ChartStruc}
                        });
            } else {
                console.log(err);
            }
        });
        

       
    }
    //done
    export function addXModule(ModuleToBeAdded: Module){
        ModuleToBeAdded.setXPos(SpawnX);
        ModuleToBeAdded.setYPos(SpawnY);
        ModuleToBeAdded.setModuleWidth();
        ModuleToBeAdded.setModuleHeight();
        ModuleToBeAdded.setPortCoords();

        ChartStruc.findIdealModuleId(0);
        ModuleToBeAdded.id=ChartStruc.nextModuleID;
        ChartStruc.ModuleList.push(ModuleToBeAdded);
        ChartStruc.ModuleList=ChartStruc.ModuleList;
    }   
    //done
    export function saveProjectToFile(ProjectName: string){
        saveToFile(ProjectName, ChartStruc);
    } 
    //done
    export function updateState(newState: Chart){
        ChartStruc=newState;
    }
</script>
    <Canvas 
        on:BackgroundMovement={handleBackGroundMovement}
        ChartStruc={ChartStruc}
        Background_dx={-3000}
        Background_dy={-3000}
        />