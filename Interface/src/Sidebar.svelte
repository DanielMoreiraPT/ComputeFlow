<script lang="typescript">
import { fly } from 'svelte/transition';
import Modal from './Modal.svelte';
import ModalModulos from './ModalModulos.svelte';
import ModalProjectName from './ModalProjectName.svelte';
import Button from './Button.svelte';
import { createEventDispatcher} from 'svelte';
const dispatch = createEventDispatcher();


import { TemplateModule, TemplatePort} from './templates';

let modal_show = false;
let modalModulos_show = false;
let modalProjectName_show = false;

export let ProjectName: string;

const saveProject = (e) => {
    if(ProjectName == undefined){
        modalProjectName_show=true;
    }
    else{
        dispatch('SaveProject', {
                   name: ProjectName,
                });   
    }
    
}
const handleAddModule = (e) => {
    dispatch('AddModule', {
            module: e.detail.module
        }); 
}
const handlesaveProjectandName = (e) => {
    ProjectName=e.detail.name;
    dispatch('SaveProject', {
                   name: ProjectName,
            });   
}
const Undo = (e) => {
    dispatch('Undo');   
}

const Redo = (e) => {
    dispatch('Redo');   
}


</script>


<nav >
    <h1 >ComputeFlow</h1>
    {#if ProjectName == undefined}
        <h4>New Project</h4>
    {:else}
        <h4>{ProjectName}.json</h4>
    {/if}
    <Button on:click={() => {modalModulos_show = true;}}>Add Module</Button>

    <Button on:click={saveProject}>Save Project</Button>
    <Button on:click={() => {modalProjectName_show = true;}}>Save Project as</Button>
    <Button on:click={() => {modal_show = true;}}>About</Button>
    <!--
    <Button on:click={}>New Project</Button>

    <Button on:click={count.increment}>+</Button>
    <Button on:click={count.decrement}>-</Button>
    <Button on:click={count.reset}>reset</Button>
    -->
    <Button on:click={Undo}>Undo</Button>
    <Button on:click={Redo}>Redo</Button>

</nav>

<Modal bind:show={modal_show} />
<ModalModulos bind:show={modalModulos_show} on:AddModule={handleAddModule}/>
<ModalProjectName bind:show={modalProjectName_show} ProjectName={ProjectName} on:SaveProjectAndName={handlesaveProjectandName}/>
		
<style>
    nav {
        position: fixed;
        top: 0;
        left: 0;
        height: 100%;
        padding: 2rem 1rem 0.6rem;
        border-left: 1px solid #aaa; 
        background: rgb(0, 0, 0);
        opacity: 0.5;
        overflow-y: auto;
        width: 10rem;
    }

    h1, h4 {
        color:white;
    }
</style>