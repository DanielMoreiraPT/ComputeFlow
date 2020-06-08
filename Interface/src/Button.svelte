
<button type="button" class="btn btn-info"  on:click>
    <slot />
</button>
<style>
    button {
        float: center;
        z-index: 11;
        opacity: 1;
        background-color: #2196F3;
        color:white;
        border:black;
        width:160px;
        height: 50px;
        padding-top: 15px;
        }
    button:hover {
        float: center;
        z-index: 11;
        opacity: 1;
        background-color: rgb(108, 183, 245);
        color:white;
        border:black;
        width:160px;
        height: 50px;
        padding-top: 15px;
        }
</style>
