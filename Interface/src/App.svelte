projectName<script lang="typescript">
	import MyAppCanvas from './Components/AppCanvas.svelte'
  import { onMount } from 'svelte';
  import { Module, Port, Connection, Chart } from './Components/StructureLogic';
  import MyButton from './Components/Button.svelte';
  import MyNavbar from './Components/Navbar.svelte';
  import MyAddModuleBar from './Components/AddModuleBar.svelte';
  import MyAppRedoUndoSave from './Components/AppRedoUndoSave.svelte';
  import { ChartHistory } from './Components/stores';


  import MyModalWrongTypes from './Components/ModalWrongTypes.svelte';
  import MyModalAlert from './Components/ModalAlert.svelte';
  let ModalWrongTypesshow = false;
  const handleWrongTypes = (e) => {
      ModalWrongTypesshow = true;
  }

  let projectName: string;
  let projectPath: string;

  let myAppCanvas;
  let myLoadProjectBar;
  let myNavBar;
  let myAddModule;
  let canvasArea;

//needed to know the size of the navbar
	$: top = myNavBar ? myNavBar.getBoundingClientRect().bottom : 0;
  $: left = myAppCanvas ? myAppCanvas.getBoundingClientRect().right : 0;

  let ModalAlertshow = false;
  let ModalAlertError = false;
  let Alertmessage;

  const handleSaveProject = (e) => {
      myAppCanvas.saveProject(projectPath)
  }
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
      ModuleToBeAdded.listVariables=TemplateModule.listVariables;

      myAppCanvas.addXModule(ModuleToBeAdded)

  }
  const handleNewProject = (e) => {
      myAppCanvas.newProject()
  }
  const handleUndo = (e) => {
      myAppCanvas.undo()
  }
  const handleRedo = (e) => {
      myAppCanvas.redo()
  }

  const handleProjectNameNotDefined = (e) => {
      myAppCanvas.trySaveProjectToFile();
  }

  const handleTrytoSaveProject = (e) => {
      myAppCanvas.trySaveProjectToFile();
  }
  const handleTryToLoadProject = (e) => {
      myAppCanvas.tryToLoadProject();
  }
  const handleNewProjectInitiated = (e) => {
      projectName=undefined;
      projectPath=undefined;
  }

  const handleFileWasLoadedCorrectly= (e) => {
      projectName=e.detail.projectName.projectName;
      projectPath=e.detail.projectPath.projectPath;

  }
</script>
<div class="grid-container">
  <div class="grid-item title" bind:this={myNavBar}>
      <div style="float: left;padding-left: 50px;">
          <h2>ComputeFlow</h2>
      </div>
  </div>
  <div class="grid-item navbar" bind:this={myNavBar}>
      <MyNavbar
          on:NewProject={handleNewProject}
          on:AddModule={handleAddModule}
          on:TrytoSaveProject={handleTrytoSaveProject}
          on:TryToLoadProject={handleTryToLoadProject}
          projectName={projectName} />
  </div>
  <div class="grid-item zoom">
  </div>
  <div class="grid-item redoundo">
      <MyAppRedoUndoSave
          projectName={projectName}
          projectPath={projectPath}
          on:SaveProject={handleSaveProject}
          on:ProjectNameNotDefined={handleProjectNameNotDefined}
          on:Redo={handleRedo}
          on:Undo={handleUndo}/>
  </div>
  <div class="grid-item AddModule" bind:this={myAddModule}>
      <MyAddModuleBar
          on:AddModule={handleAddModule}
          />

  </div>

  <div class="grid-item canvas" bind:this={canvasArea}>
      <MyAppCanvas
          bind:this={myAppCanvas}
          {left}
          {top}

          on:fileWasLoadedCorrectly={handleFileWasLoadedCorrectly}
          on:fileWasSavedCorrectly={handleFileWasLoadedCorrectly}
          on:newProjectInitiated={handleNewProjectInitiated}

          on:wrongTypes={handleWrongTypes}
          projectName={projectName}
          />
  </div>
</div>
<MyModalWrongTypes bind:show={ModalWrongTypesshow} />

<style>
  .grid-container {
  display: grid;
  grid-row-gap: 1px;
  background-color: #27948e;
grid-auto-rows: 50px minmax(100px, auto)  minmax(100px, auto);
grid-auto-columns: 250px auto auto auto auto;
  height:100%;
  }

  .grid-item {
  background-color:  rgb(51, 51, 51);
  text-align: center;
  }

  .title {
  grid-column: 1 / span 2;
  grid-row: 1;
  }
  .navbar {
  grid-column: 3 / span 4;
  grid-row: 1;
  }

  .zoom {
  grid-column: 7 / span 2;
  grid-row: 1;
  }
  .undoredo {
  grid-column: 9 / span 2;
  grid-row: 1;
  }
  .canvas {
  grid-column: 2 / span 8;
  grid-row: 2/ span 2;
overflow: hidden;
position: relative;
  }
  .AddModule {
  grid-column: 1 / span 1;
  grid-row: 2/ span 2;
overflow-y: scroll;
  }

  .ProjectNameInput {
  height: 50px;
  }

  h1, h5, h4, h2 {
      color:white;
  }
  ::-webkit-scrollbar {
      background-color: #27948e;
      width: .8em
  }

  ::-webkit-scrollbar-thumb:window-inactive,
  ::-webkit-scrollbar-thumb {
          background:  white
  }
</style>
