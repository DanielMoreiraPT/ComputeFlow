
<script lang="typescript">
    import { createEventDispatcher} from 'svelte';     
	import { Module, Port } from './StructureLogic';
	import { connections } from './connections';
	//corresponds to the number of the port, of its the 1st, 2nd,...
	export let portNumber: number;

	export let varType: string;
	export let varName: string;
	export let port: Port;

	export let xPos: number;
	export let yPos: number;

	let cx : number= xPos+15;
	let cy : number= yPos+10;

	let portLabelX: number = xPos+28;
	let portLabelY: number = yPos+14;
	
	let transformValue: number = 50+(25*portNumber);
	let cyRealValue : number =cy+transformValue;

	let space: string = ' ';
	

	port.setXPos(cx);
	port.setYPos(cyRealValue);
	port.setId(portNumber);
	const dispatch = createEventDispatcher();

	const handleConnectionStart = (e) => {
		let {lastX, lastY} = e.detail
		dispatch('handleConnectionStart', {
                    xInitial: cx,
                    xFinal: lastX,
                    yInitial: cyRealValue,
                    yFinal: lastY,
					port: {port}
                });
		
    }
	const handleConnectionDrag = (e) => {
		let {lastX, lastY, dx, dy} = e.detail
		dispatch('handleConnectionDrag', {
			xInitial: cx,
			xFinal: lastX,
			yInitial: cyRealValue,
			yFinal: lastY,
			port: {port}
		});
	}
	const handleConnectionEnd = (e) => {
		let {lastX, lastY, dx, dy} = e.detail
		dispatch('handleConnectionEnd', {
			xInitial: cx,
			xFinal: lastX,
			yInitial: cyRealValue,
			yFinal: lastY,
			port: {port}
		});
	}
	
</script>



<g class="input-field" transform="translate(0, {transformValue})">
	<g class="port" 
				use:connections
				on:connectionDrag={handleConnectionDrag}
				on:connectionStart={handleConnectionStart}
				on:connectionEnd={handleConnectionEnd}>
		<circle class="port-outer" cx={cx} cy={cy} r="7.5" />
		<circle class="port-inner" cx={cx} cy={cy} r="5" />
		<circle class="port-scrim" cx={cx} cy={cy} r="7.5" />
	</g>
	<text class="port-label" x={portLabelX} y={portLabelY}>{varType} {space} {varName}</text>
</g>

<style>
	.port {
	cursor: pointer;
	}
	.port-scrim {
	fill: transparent;
	}
	.port-outer {
	fill: #777777;
	}
	.port-inner {
	fill: #202020;
	}
	.port-label {
	font-size: 12px;
	fill: #fff;
	}
	.input-field .port-label {
	text-anchor: start;
	}
</style>