{#if show}
<div>

  <div class="modal-overlay" data-close on:click={overlay_click} transition:fade={{duration: 150}}>
    <div class="modal-container">
      <main><h1>ComputeFlow</h1>
            <h4>https://github.com/DanielMoreiraPT/ComputeFlow</h4>
            <h2>Computeflow is a final project for Informatics Engineering Bachlor's degree.</h2>
            <p>It's goal is to develop software able to provide an intuitive and interactive Interface for users that require usage of data flow programming without having extensive programming knowledge.</p>
            <h2>Members</h2>    
            <h3>Computation: </h3>
                    <p>Aneta Pawelec (pawelec.aneta98@gmail.com)</p>
                    <p>Daniel Moreira (danielbarbosa@ua.pt)</p>
            <h3>Interface: </h3>
                    <p>André Catarino (andre.catarino@ua.pt)</p>
                    <p>Rui Melo (r.melo@ua.pt)</p>

            <h2>Orientators</h2>   
                <p>José Maria Fernandes (jfernan@ua.pt)</p>
                <p>Sérgio Miguel Santos (sergio.santos@ua.pt)</p>
                    
            <h2>Supervisors</h2>   
                <p>José Moreira (jose.moreira@ua.pt)</p>
                <p>António Sousa Pereira (f185@ua.pt)</p>
                <p>Rui Aguiar (ruilaa@ua.pt)</p>
                
    </main>
    </div>
  </div>
</div>
{/if}

<script>
import { fade } from 'svelte/transition';

function overlay_click(e) {
    if ('close' in e.target.dataset)
        show = false;
}

export let show = false;
</script>

<style>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.modal-container {
  position: relative;
  background-color:rgb(51, 51, 51);
  width: 50vw;
  margin: 1rem auto 0.2rem;
  box-shadow: 0 3px 10px #555;
}
main {
  padding: 0.5rem;
  color: white;
}
</style>