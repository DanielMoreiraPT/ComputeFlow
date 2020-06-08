<script lang="typescript">
    import { fly } from 'svelte/transition';
    import Button from './Button.svelte';
    import { createEventDispatcher} from 'svelte';
    import { onMount } from 'svelte';  
    const dispatch = createEventDispatcher();
    import { TemplateModule, TemplatePort} from './templates';
    var fs = require('fs');


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


<nav >
    
    {#if ProjectsToLoad.length!=0}
        <h1>Load Project</h1>
        {#each ProjectsToLoad as ex}
            <Button on:click={e => sendFileInfo(ex)}>{ex}</Button>
        {/each}
    {:else}
        <h1>No Projects Available</h1>
        <h4>Directory: '../MyFlowProjects'</h4>
    {/if}
</nav>
		
<style>
    nav {
        position: fixed;
        top: 0;
        right: 0;
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