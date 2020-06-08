import { Module, Port, Connection, Chart } from './StructureLogic';
//TODO remove module args: chart a onde se esta a ler & module.. o que interessa é o id deste... 
export function removeModule(chart: Chart, module: Module){
    for(let moduleentry of chart.ModuleList){
        if(moduleentry.id == module.id){
            //delete connections associated in FinalConnections
            for(let conex of chart.FinalConnections){
                if(conex.externalNode !== undefined){
                    if(conex.parentNode.id == moduleentry.id || conex.externalNode.id == moduleentry.id ){
                    let indexC = chart.FinalConnections.indexOf(conex);
                        if (indexC > -1) {
                            chart.FinalConnections.splice(indexC, 1);
                        } 
                    }
                }
            }
            
            //delete module
            let indexM = chart.ModuleList.indexOf(moduleentry);
            if (indexM > -1) {
                chart.ModuleList.splice(indexM, 1);
            }
        }
        
    }

    for(let moduleentry of chart.ModuleList){   
            //delete connections inside modules
            if(moduleentry.connectionsInputs !== undefined){
                for(let conexCI of moduleentry.connectionsInputs){
                    if(conexCI.Connection.parentNode.id == moduleentry.id){
                        let indexCI = moduleentry.connectionsInputs.indexOf(conexCI);
                        if (indexCI > -1) {
                            moduleentry.connectionsInputs.splice(indexCI, 1);
                        } 
                    }
                }
            }
            
            if(moduleentry.connectionsOutputs !== undefined){
                for(let conexCO of moduleentry.connectionsOutputs){ 
                    if(conexCO.Connection.externalNode !== undefined){     
                        if(conexCO.Connection.externalNode.id == moduleentry.id){
                            let indexCO = moduleentry.connectionsOutputs.indexOf(conexCO);
                            if (indexCO > -1) {
                                moduleentry.connectionsOutputs.splice(indexCO, 1);
                            } 
                        }
                    }
                }
            }
        }
}

export function addModule(chart: Chart, module: Module){
    chart.addModule(module);
}