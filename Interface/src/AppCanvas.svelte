<script lang="typescript">	
    import Canvas from './Canvas.svelte'
    import { Module, Port, Connection, Chart } from './StructureLogic';
    import Button from './Button.svelte';
    import { createEventDispatcher} from 'svelte';
    import { ChartHistory} from './stores';
   
    const dispatch = createEventDispatcher();
    
    var fs = require('fs');

  
    let ChartStruc: Chart = new Chart("NewProject");
    
    let __HistoryChart: ChartHistory = new ChartHistory();
    //need to initialize vars -> it would not work if after loaded, the diagram was not moved
    let Background_dxInitial: number = -3000;
    let Background_dyInitial: number = -3000;
    let Background_dx: number;
    let Background_dy: number;
    let SpawnX: number=-Background_dxInitial+600;
    let SpawnY: number=-Background_dxInitial+600;

    const handleBackGroundMovement = (e) => {
        Background_dx = e.detail.Background_dx.Background_dx;
        Background_dy = e.detail.Background_dy.Background_dy;
        SpawnX = -Background_dx+400;
        SpawnY = -Background_dy+400;
    }
    function saveAsToFile(filename:string, chart: Chart){
        var json = ChartStruc.toJSON();

        fs.writeFile(filename, json, (err) => {
            if(err){
                alert("An error ocurred creating the file ")
                dispatch('error', {
                    message: "An error ocurred creating the file "
                });
            }else{
                alert("File Saved Correctly");

                let filenameSplited=filename.split('.');
                let file:string=filenameSplited[0];
                let ProjectName=file.split('/').pop();
                let ProjectPath=filename;
                dispatch('fileWasSavedCorrectly', {
                    ProjectName: {ProjectName},
                    ProjectPath: {ProjectPath}
                });
            }
                        
        });
    }

    export function addXModule(ModuleToBeAdded: Module){
        __HistoryChart.addState(ChartStruc.toJSON());

        ModuleToBeAdded.setXPos(SpawnX);
        ModuleToBeAdded.setYPos(SpawnY);
        ModuleToBeAdded.adjustOwnProperties();
        ChartStruc.findIdealModuleId(0);
        ModuleToBeAdded.id=ChartStruc.nextModuleID;
        ChartStruc.ModuleList.push(ModuleToBeAdded);
        ChartStruc.ModuleList=ChartStruc.ModuleList;
        let chartToBePassed: Chart = ChartStruc;
    }   
    export function saveProject(filename:string){
        saveAsToFile(filename, ChartStruc);
    }
    export function trySaveProjectToFile(){
        const {dialog} = require("electron").remote;
        let filename = dialog.showSaveDialogSync()
        if(filename === undefined){
            console.log("filename undefined");
            return;
        }else{ 
            if(filename.split('.').pop()!='json'){
                alert("Wrong file extension. Try .json");
            }else{
                saveAsToFile(filename, ChartStruc);
            }
        }
    }
    export function tryToLoadProject(){
        const {dialog} = require("electron").remote;
        let filename = dialog.showSaveDialogSync()
        if(filename === undefined){
            console.log("filename undefined");
            return;
        }else{  
            let filenameSplited=filename.split('.');
            let file:string=filenameSplited[0];
            let extension:string=filenameSplited[1];
            if(extension=="json"){
                var path = require('path');  

                let filePath=filename;
                let ProjectName=file.split('/').pop();
                let ProjectPath=filename;
                ChartStruc = new Chart(file);
                fs.readFile(filePath, function(err,data){
                    if (!err) {
                        let json = JSON.parse(data);
                        let ModulesList=[];
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

                            if(json.Modules[i].Variables){
                                FlowModuleObject.listVariables=json.Modules[i].Variables;
                            }
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


                        //history
                        __HistoryChart.clear();

                        dispatch('fileWasLoadedCorrectly', {
                            ProjectName: {ProjectName},
                            ProjectPath: {ProjectPath}
                        });

                    } else {
                        console.log(err);
                    } 
                });
            }else{
                alert("Wrong file extension");
            }
                }
    }
    export function newProject(){
        ChartStruc= new Chart("NewProject");

        __HistoryChart.clear();

        dispatch('newProjectInitiated');
    }

    let myCanvas;
    export let left: number;
    export let top: number;
    
    
    export function redo(){
        //console.log("before redo")
        //console.log(__HistoryChart)
        let newstate =__HistoryChart.redo(ChartStruc);
        if(newstate){
            ChartStruc.loadJSON(newstate);
            for(let moduleEntry of ChartStruc.ModuleList){
                moduleEntry.setPortCoords();
            }ChartStruc.ModuleList=ChartStruc.ModuleList
        } 
        ChartStruc=ChartStruc;
        
        //console.log("after redo")
        //console.log(__HistoryChart)
    }
    export function undo(){
        //console.log("before undo")
        //console.log(__HistoryChart)
        let newstate =__HistoryChart.undo(ChartStruc);
        if(newstate){
            ChartStruc.loadJSON(newstate);
            for(let moduleEntry of ChartStruc.ModuleList){
                moduleEntry.setPortCoords();
            }ChartStruc.ModuleList=ChartStruc.ModuleList
        } 
        ChartStruc=ChartStruc;
        
        //console.log("after undo")
        //console.log(__HistoryChart)
    }
    export function handleWrongTypes(){
        dispatch("wrongTypes");
    }
    
</script>
    <Canvas bind:this={myCanvas}
        on:BackgroundMovement={handleBackGroundMovement}
        on:wrongTypes={handleWrongTypes}
        ChartStruc={ChartStruc}
        Background_dx={-3000}
        Background_dy={-3000}
        {__HistoryChart}
        {left}
        {top}
        />
