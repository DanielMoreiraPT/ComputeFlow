<script lang="typescript">
    import FlowModule from './FlowModule.svelte'
    import ConnectionSVG from './ConnectionSVG.svelte'
    import { onMount } from 'svelte';
    import { Module, Port, Connection } from './StructureLogic';
    import { spring } from 'svelte/motion';
	import {draggable} from './draggable.js'

    //allow dragging the chart
    let dx = -2000;
	let dy = -2000;
	const handleDragMoveBackground = (e) => {
		let { dx: _dx, dy: _dy } = event.detail;
		dx += _dx;
		dy += _dy;

	}



    //ggotta be global and export from app maybe.. so other "apps" can access
    var connections: Connection[]=[];
    var Finalconnections: Connection[]=[];  
    var ModulesList: Module[]=[];

    //bunch of inputs/outputs for a module
    let InputObject0 = new Port(true, 'String', 'IN')
    let InputObject1 = new Port(true, 'String', 'INININ')
    let OutputObject0 = new Port(false, 'String', 'Out')
    let OutputObject1 = new Port(false, 'String', 'out out out out')
    let FlowModuleObject = new Module(1, 'exemplo', 3000, 3000);
    FlowModuleObject.addOutputs([OutputObject0, OutputObject1])
    FlowModuleObject.addInputs([InputObject0, InputObject1])
    FlowModuleObject.setModuleWidth();
    FlowModuleObject.setModuleHeight();
    FlowModuleObject.setPortCoords();

    let InputObject2 = new Port(true, 'String', 'jesus & devil')
    let InputObject3 = new Port(true, 'String', 'hello good sir')
    let OutputObject2 = new Port(false, 'String', 'nooo')
    let OutputObject3 = new Port(false, 'String', 'ole')
    let FlowModuleObject2 = new Module(2, 'exemplo2', 2800, 2800);
    FlowModuleObject2.addOutputs([OutputObject2, OutputObject3])
    FlowModuleObject2.addInputs([InputObject2, InputObject3])
    FlowModuleObject2.setModuleWidth();
    FlowModuleObject2.setModuleHeight();
    FlowModuleObject2.setPortCoords();

    let connection0 = new Connection('connectionX', InputObject0, true, FlowModuleObject);
    connection0.setConnectedPort(OutputObject3, FlowModuleObject2);
    
    FlowModuleObject.addInputConnection(InputObject0, OutputObject1, FlowModuleObject2 ,connection0);
    FlowModuleObject2.addOutputConnection(OutputObject3, InputObject0, FlowModuleObject ,connection0);
    
    connection0.calculateCurve();
    
    Finalconnections.push(connection0);
    Finalconnections=Finalconnections;
    
    ModulesList.push(FlowModuleObject);
    ModulesList.push(FlowModuleObject2);

    //verify if given coords represent a port and if it has certain PortType //TODO O(n**2) not a good thing
    function verifyCoordsIsPortFromType(CoordX:number, CoordY:number, originalPort: Port, originalModule: Module){
        for(let module of ModulesList){
            //se a porta inicial for input so vamos avaliar outputs e vice versa
            if(originalPort.isInput == false){
                for(let input of module.inputList){
                    if(input.xPos - input.hiboxSize <= CoordX  && input.xPos + input.hiboxSize >= CoordX  ){
                        if(input.yPos - input.hiboxSize <= CoordY  && input.yPos + input.hiboxSize >= CoordY  ){
                            //we need to know if the types are the same
                            if(input.varType == originalPort.varType){
                               //TODO nomes dinamicos
                                let name: string = 'connection' + ModulesList.length
                                let connection = new Connection(name, originalPort, originalPort.isInput, originalModule);   
                                connection.setConnectedPort(input, module);    
                                
                                
                                //inputmodule
                                //InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection)
                                originalModule.addOutputConnection(InputObject0, input, module ,connection);
                                
                                //outputmodule
                                //InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection
                                module.addInputConnection(input, originalPort, originalModule ,connection);
    

                                connection.calculateCurve();      
                                Finalconnections.push(connection);
                                Finalconnections=Finalconnections;
                            }
                        }
                    }
                }
            }else{
                for(let output of module.outputList){
                    if(output.xPos - output.hiboxSize <= CoordX  && output.xPos + output.hiboxSize >= CoordX){
                        if(output.yPos - output.hiboxSize <= CoordY  && output.yPos + output.hiboxSize >= CoordY){
                            //we need to know the port of the module now
                            if(output.varType == originalPort.varType){
                                //TODO nomes dinamicos
                                let name: string = 'connection' + ModulesList.length
                                let connection = new Connection(name, originalPort, originalPort.isInput, originalModule); 

                                connection.setConnectedPort(output, module);

                                //inputmodule
                                //InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection)
                                originalModule.addInputConnection(InputObject0, output, module ,connection);
                                
                                //outputmodule
                                //InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection
                                module.addOutputConnection(output, originalPort, originalModule ,connection);
    
                                connection.calculateCurve();                  
                                Finalconnections.push(connection);
                                Finalconnections=Finalconnections;
                             
                            }
                        }
                    }
                }

            }
        }
    }
    //TODO posso nao tar sempre a criar e dar simplesment update as ligacoes
	const handleDragEnd = (e) => {
        let moduleDragged: Module;
        moduleDragged = e.detail.Module;
        
        let dx : number = e.detail.dx.dx;
        let dy : number = e.detail.dy.dy; 
        let lastX : number = e.detail.lastX.lastX;
        let lastY : number = e.detail.lastY.lastY;  
        
        //TODO ma logica a dar coord no modulo
        
        for (let moduleentry of ModulesList){
            if(moduleentry.id == moduleDragged.StrucModule.id){
                moduleentry.setPortCoords();
                if(moduleentry.connectionsInputs !== undefined){
                    for(let inputconnection of moduleentry.connectionsInputs){
                        inputconnection.Connection.calculateCurve();

                        for(let finalconnection of Finalconnections){
                            if(finalconnection.id == inputconnection.Connection.id){
                                finalconnection=inputconnection;
                            }
                        }
                        
                    }
                }
                if(moduleentry.connectionsOutputs !== undefined){
                    for(let outputconnection of moduleentry.connectionsOutputs){
                        outputconnection.Connection.calculateCurve();

                        for(let finalconnection of Finalconnections){
                            if(finalconnection.id == outputconnection.Connection.id){
                                finalconnection=outputconnection;
                            }
                        }
                    }
                }
            }
            Finalconnections=Finalconnections;
        }

    }
	const handleDragMove = (e) => {
        let moduleDragged: Module;
        moduleDragged = e.detail.Module;
        let dx : number = e.detail.dx.dx;
        let dy : number = e.detail.dy.dy; 
        let lastX : number = e.detail.lastX.lastX;
        let lastY : number = e.detail.lastY.lastY;  

        //TODO
        for (let moduleentry of ModulesList){
            if(moduleentry.id == moduleDragged.StrucModule.id){
                moduleentry.setPortCoords();
                if(moduleentry.connectionsInputs !== undefined){
                    for(let inputconnection of moduleentry.connectionsInputs){
                        inputconnection.Connection.calculateCurve();

                        for(let finalconnection of Finalconnections){
                            if(finalconnection.id == inputconnection.Connection.id){
                                finalconnection=inputconnection;
                            }
                        }
                        
                    }
                }
                if(moduleentry.connectionsOutputs !== undefined){
                    for(let outputconnection of moduleentry.connectionsOutputs){
                        outputconnection.Connection.calculateCurve();

                        for(let finalconnection of Finalconnections){
                            if(finalconnection.id == outputconnection.Connection.id){
                                finalconnection=outputconnection;
                            }
                        }
                    }
                }
            }
            Finalconnections=Finalconnections;
        }
        //moduleDragged.StrucModule.setPortCoords();  --> not working

    }
	const handleConnectionStart = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port, parentModule} = e.detail;
        //let connection = createConnection(e.detail.xInitial.xInitial.xInitial, e.detail.yInitial.yInitial.yInitial,e.detail.xFinal.xFinal.xFinal, e.detail.yFinal.yFinal.yFinal, e.detail.port.port.port, e.parentModule);
        
        //TODO id da conexao dinamicamente
        let connection = new Connection('tentativa', port.port.port.port, port.port.port.port.isInput, parentModule.StrucModule);
        connection.setEndPoints( xFinal.xFinal.xFinal, yFinal.yFinal.yFinal);
        connection.calculateCurve();
        connections.push(connection);
        connections=connections;
        
    }
	const handleConnectionDrag = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port, parentModule} = e.detail;
        connections=[];
        //TODO id da conexao dinamicamente
        let connection = new Connection('tentativa', port.port.port.port, port.port.port.port.isInput, parentModule.StrucModule);
        connection.setEndPoints( xFinal.xFinal.xFinal, yFinal.yFinal.yFinal);
        connection.calculateCurve();
        connections.push(connection);
        connections=connections;
    }
	const handleConnectionEnd = (e) => {
        let {xInitial, xFinal, yInitial, yFinal, port, parentModule} = e.detail;
        connections=[];
        verifyCoordsIsPortFromType(xFinal.xFinal.xFinal, yFinal.yFinal.yFinal, port.port.port.port, parentModule.StrucModule)
    }

</script>
<svg id="svg"
            use:draggable  
            on:dragmove={handleDragMoveBackground}
            transform={`translate(${dx} ${dy})`} >
	<g class="chart" id="diagram" data-drag="diagram:diagram" data-drag-type="diagram"  >  
            <FlowModule 
                StrucModule={FlowModuleObject} 
                on:handleDragEnd={handleDragEnd}
                on:handleDragMove={handleDragMove}
                on:handleConnectionStart={handleConnectionStart}
                on:handleConnectionDrag={handleConnectionDrag}
                on:handleConnectionEnd={handleConnectionEnd}
                /> 
            <FlowModule 
                StrucModule={FlowModuleObject2} 
                on:handleDragEnd={handleDragEnd}
                on:handleDragMove={handleDragMove}
                on:handleConnectionStart={handleConnectionStart}
                on:handleConnectionDrag={handleConnectionDrag}
                on:handleConnectionEnd={handleConnectionEnd}
                /> 

            {#each connections as connection,i (i)}
                <path d={connection.curve} fill="transparent"/>
            {/each}
            {#each Finalconnections as connection,i (i)}
                <ConnectionSVG 
                    connection={connection}
                    />
            {/each}
            
    </g>
</svg>
<style>
    #svg{
        background-color: rgb(92, 20, 44);
    }
	svg { width: 1000%; height: 1000% }

    path{
        stroke-width: 5;
        stroke-opacity: 0.5;
        stroke:#ff3e00;

    }
	circle { fill: #ff3e00; opacity:1;z-index: 1 }
	circle:hover { fill: #a50c25; opacity:1;z-index: 1}
</style>