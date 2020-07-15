<script lang="typescript">
    export let StrucModule: Module;
	let moduleName: string;
	let moduleWidth: number;
    let xPosHeader: number;
	let yPosHeader: number;
    let headerTitleX: number;
    let headerTitleY: number;

    //alterar possivelmente o fundo do header e ajustar
    let headerRectX: number;  
    let headerRectY: number;


    $:xPosHeader = StrucModule.xPos+2;
    $:yPosHeader = StrucModule.yPos+2;
    $:moduleName = StrucModule.name;
    $:moduleWidth = StrucModule.getModuleWidth();
    $:headerTitleX = xPosHeader+moduleWidth/2;
    $:headerTitleY = yPosHeader+30;
    $:headerRectX = StrucModule.xPos;
    $:headerRectY = StrucModule.yPos;
    
</script>
<g class="node-header">
    <rect class="header-round-rect" width={moduleWidth} height="40" x={xPosHeader} y={yPosHeader} rx="4" ry="4" />
    <rect class="header-rect" width={moduleWidth} height="36" x={headerRectX} y={headerRectY} />
    <text class="header-title" x={headerTitleX} y={headerTitleY}>{moduleName}</text>
</g>

<style>
    .node-header {
	fill: rgb(23, 218, 201);
	}
	.node-header .header-title {
	font-size: 20px;
	fill: #fff;
	text-anchor: middle;
	}
</style>