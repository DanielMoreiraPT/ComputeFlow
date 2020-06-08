<script lang="typescript">	
    import AppCanvas from './AppCanvas.svelte'
    import { onMount } from 'svelte';   
    import { Module, Port, Connection, Chart } from './StructureLogic';
    import Sidebar from './Sidebar.svelte';
    import LoadProjectBar from './LoadProjectBar.svelte';
    import {addModule, removeModule} from './ChartInteraction';
    import {ChartHistory} from './stores';

    
    var fs = require('fs');
    var dir = '../MyFlowProjects';

    let ProjectName: string;

    let ChartHistory_ = new ChartHistory();


    //conditon to swithc canvas here needed to be implemented
    let myAppCanvas;
    let myLoadProjectBar;

    //done
    const handleSaveProject = (e) => {
        let ProjectName:string = e.detail.name
        //TODO not the  ideal solution
        myAppCanvas.saveProjectToFile(ProjectName)
    }

    //done
    const handleAddModule = (e) => {
        let TemplateModule= e.detail.module;
        let ModuleToBeAdded: Module = new Module(TemplateModule.name);
        for(let i=0; i<TemplateModule.listInputs.length; i++){
            let PortToBeAdded: Port = new Port(TemplateModule.listInputs[i].isInput, TemplateModule.listInputs[i].varType, TemplateModule.listInputs[i].varName);
            ModuleToBeAdded.inputList.push(PortToBeAdded);
        }
        for(let i=0; i<TemplateModule.listOutputs.length; i++){
            let PortToBeAdded: Port = new Port(TemplateModule.listOutputs[i].isInput, TemplateModule.listOutputs[i].varType, TemplateModule.listOutputs[i].varName);
            ModuleToBeAdded.outputList.push(PortToBeAdded);
        }
        ModuleToBeAdded.functionId=TemplateModule.functionId;
        ModuleToBeAdded.name=TemplateModule.name;
        
        myAppCanvas.addXModule(ModuleToBeAdded)
        
    }
    //done
    const handleLoadFile = (e) => {
        //dont know if i should put it here
        //save opened project first
        myAppCanvas.loadFile(e.detail.name);
    }
    
   
    const handleUndo = (e) => {
        ChartHistory_.undo();
        myAppCanvas.updateState(ChartHistory_.actualState);
    }
    const handleRedo = (e) => {
        ChartHistory_.redo();
        myAppCanvas.updateState(ChartHistory_.actualState);
        
    }

    //done(new logic associated)
    const handleFileWasSaved = (e) => {
        let nameOfProject = e.detail.fileSaved.ProjectName;
        myLoadProjectBar.addProjectName(nameOfProject);
        
    }
    //done
    const handleUpdateActiveProjectNameAndState = (e) => {
        let nameOfProject = e.detail.projectName.ProjectName;
        ProjectName = nameOfProject
        ChartHistory_.addState(e.detail.state.ChartStruc);
    }
    

</script>

<div id="WorkingCanvas">
    <AppCanvas 
        bind:this={myAppCanvas}
        on:fileWasSaved={handleFileWasSaved}
        on:updateActiveProjectNameAndState={handleUpdateActiveProjectNameAndState}
        /> 
    <!--
    <Canvas 
        on:BackgroundMovement={handleBackGroundMovement}
        ChartStruc={Chart0}
        Background_dx={Background_dxInitial}
        Background_dy={Background_dyInitial}
        />-->

    <Sidebar 
        on:SaveProject={handleSaveProject}
        on:AddModule={handleAddModule}
        on:Undo={handleUndo}
        on:Redo={handleRedo}
        ProjectName={ProjectName}
        />
    <LoadProjectBar
        bind:this={myLoadProjectBar}
        on:LoadFile={handleLoadFile}
        />

</div>
<style>
    #WorkingCanvas {
        z-index: -1;
        height: 100%;
        width: 80%;
        background-color:rgb(92, 20, 44);
    }
    #BarModulesForAdding {
        height: 100%;
        width: 20%;
        background-color:rgb(83, 71, 75);
    }
</style>