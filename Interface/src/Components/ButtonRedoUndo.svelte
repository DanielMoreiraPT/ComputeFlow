<script lang="typescript">

</script>
<button type="button" class="btn btn-info"  on:click>
    <slot/>
</button>
<style>
    button {
        float: center;
        z-index: 11;
        opacity: 1;
        background-color: #27948e;
        color:white;
        border:black;
        width:50px;
        height: 50px;
        }
    button:hover {
        float: center;
        z-index: 11;
        opacity: 1;
        background-color: rgb(108, 183, 245);
        color:white;
        border:black;
        width:50px;
        height: 50px;
        }
</style>
