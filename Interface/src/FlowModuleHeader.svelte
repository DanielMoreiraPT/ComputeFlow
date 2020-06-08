<script lang="typescript">
    export let ModuleName: string;
	export let moduleWidth: number;
	export let xPos: number;
    export let yPos: number;

	let xPosHeader: number = xPos+2;
	let yPosHeader: number = yPos+2;
    let headerTitleX: number = xPosHeader+moduleWidth/2;
    let headerTitleY: number = yPosHeader+30;

    //alterar possivelmente o fundo do header e ajustar
    let headerRectX: number = xPos;   
    let headerRectY: number = yPos;
</script>
<g class="node-header">
    <rect class="header-round-rect" width={moduleWidth} height="40" x={xPosHeader} y={yPosHeader} rx="4" ry="4" />
    <rect class="header-rect" width={moduleWidth} height="36" x={headerRectX} y={headerRectY} />
    <text class="header-title" x={headerTitleX} y={headerTitleY}>{ModuleName}</text>
</g>

<style>
    .node-header {
	fill: #2196F3;
	}
	.node-header .header-title {
	font-size: 20px;
	fill: #fff;
	text-anchor: middle;
	}
</style>