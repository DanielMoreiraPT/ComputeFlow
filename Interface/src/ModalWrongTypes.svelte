
<script>
    import { fade } from 'svelte/transition';

    import GoodEmoji from './../node_modules/svelte-icons/fa/FaSmile.svelte'
    import TipEmoji from './../node_modules/svelte-icons/fa/FaSmileWink.svelte'
    import BadEmoji from './../node_modules/svelte-icons/fa/FaSadTear.svelte'


    function overlay_click(e) {
        if ('close' in e.target.dataset)
            show = false;
    }
    export let show = false;
</script>


{#if show}
    <div>
      <div class="modal-overlay" data-close on:click={overlay_click} transition:fade={{duration: 150}}>
        <div class="modal-container">
          <main class="grid-container">
            <h4 class="welcoming">Hello there!!!</h4>
            <div class="emoji"><TipEmoji/></div>
            <h4 class="messageIntro">I heard that you're trying to make a connection! There are several port types, but it is only possible to connect between similar port types!</h4>
          </main>
        </div>
      </div>
    </div>
{/if}


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
    width: 30vw;
    margin: 1rem auto 0.2rem;
    box-shadow: 0 3px 10px #555;
  }
  main {
    padding: 0.5rem;
    color: white;
    text-align: center;
  }
  .grid-container {
    display: grid;
    height:100%;
    }

  .welcoming {
    grid-column: 1 / span 1;
    grid-row: 1;
  }
  .emoji {
    grid-column: 2 / span 1;
    grid-row: 1;
  }
  .messageIntro {
    grid-column: 1 / span 2;
    grid-row: 2;
  }
  .message {
    grid-column: 1 / span 2;
    grid-row: 3;
  }
</style>