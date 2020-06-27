<script lang="typescript">
    import Button from './Button.svelte';
    import { createEventDispatcher} from 'svelte';
    import { onMount } from 'svelte';  
    const dispatch = createEventDispatcher();
    import { TemplateModule, TemplatePort} from './templates';
    var fs = require('fs');

    export let ProjectName;
    let maxLength: number = 16;
    let displayName = " ";


    $: if(ProjectName!==undefined){
    if(ProjectName.length > maxLength) {
            displayName = `${ProjectName.slice(0, maxLength)}...`;
    } else {
        displayName = ProjectName+".json";
    }}

    let ProjectsToLoad = [];
	onMount(async () => {
        fs.readdir('../MyFlowProjects/', (err, files) => { 
            if (err) 
                console.log(err); 
            else { 
                files.forEach(file => { 
                    let filename = file.split(".", 2); 

                    if(filename[1] && filename[1]=='json'){
                        ProjectsToLoad.push(filename[0]);
                    }
                }) 
                ProjectsToLoad=ProjectsToLoad;
            } 
        })

    });
    export function addProjectName(ProjectName: string){
        let addProjectToList: Boolean=true;
        for(let name of ProjectsToLoad){
            if(name == ProjectName){
                addProjectToList=false;
                break;
            }
        }
        if(addProjectToList==true){
            ProjectsToLoad.push(ProjectName)
        }
        ProjectsToLoad=ProjectsToLoad
        
    }
    function sendFileInfo(filename: string){
        dispatch('LoadFile', {
                    name: filename
                });   
    }



</script>
{#if ProjectsToLoad.length!=0}
    <h4>Load Project</h4>
    
    {#if ProjectName != undefined && ProjectName.length > 0}
        <h5>{displayName}</h5>
    {:else}
        <h5>New Project</h5>
    {/if}
    {#each ProjectsToLoad as ex}
        <div>
            <Button on:click={e => sendFileInfo(ex)} name={ex}></Button>
        </div>
    {/each}
{:else}
    <h4>No Projects Available</h4>
    <h5>Directory: '../MyFlowProjects'</h5>
{/if}

<style>

    h5, h4 {
        color:white;
    }
</style>