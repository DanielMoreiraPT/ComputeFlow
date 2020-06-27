<script lang="typescript">
    import ButtonRedoUndo from './ButtonRedoUndo.svelte';
    import { createEventDispatcher} from 'svelte';
    import GoArrowLeft from './../node_modules/svelte-icons/fa/FaReply.svelte'
    import GoArrowRight from './../node_modules/svelte-icons/fa/FaShare.svelte'
    import SaveIcon from './../node_modules/svelte-icons/fa/FaSave.svelte'
   
    const dispatch = createEventDispatcher();
    export let ProjectName;
    
    const Undo = (e) => {
        dispatch('Undo');   
    }
    const Redo = (e) => {
        dispatch('Redo');   
    }
    const saveProject = (e) => {
        if(ProjectName == undefined){

            dispatch('ProjectNameNotDefined',{
                message: "Project Name not defined"
            });   
        }
        else{
            dispatch('SaveProject', {
                    name: ProjectName,
                    });   
        }
        
    }
  
</script>
<div>
    <ButtonRedoUndo on:click={Undo}>
        <GoArrowLeft />
    </ButtonRedoUndo>  
    <ButtonRedoUndo on:click={Redo}>
        <GoArrowRight />
    </ButtonRedoUndo>   
    <ButtonRedoUndo on:click={saveProject}>
        <SaveIcon /> 
    </ButtonRedoUndo>   
</div>