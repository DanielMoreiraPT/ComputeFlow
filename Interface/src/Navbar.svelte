<script lang="typescript">
    import Modal from './Modal.svelte';
    import ModalIntro from './ModalIntro.svelte';
    
    import Button from './Button.svelte';
    import { createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();
 

    import { TemplateModule, TemplatePort} from './templates';


    let modal_show = false;
    let modalHowitWorks_show = false;

    const newProject = (e) => {   
        dispatch('NewProject');   
    }
    const TryToSaveProject = (e) => { 
        dispatch('TrytoSaveProject');   
    }


</script>
<div>
    <Button on:click={newProject}                                               name={"New Project"}>       </Button>
    <Button on:click={() => {modalHowitWorks_show = true;}}                     name={"How it works"}>      </Button>
    <Button on:click={() => {modal_show = true;}}                               name={"About"}>             </Button>
    <Button on:click={TryToSaveProject}                                         name={"Save as"}>           </Button>
    
</div>

<Modal bind:show={modal_show} />

<ModalIntro bind:show={modalHowitWorks_show} />