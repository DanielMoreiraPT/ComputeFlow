import { Module, Port, Connection, Chart } from './StructureLogic';


export class ChartHistory {

	ChartRedo : Chart[] = [];
	ChartUndo : Chart[] = [];
	actualState ?:Chart | undefined;
	constructor(){
	}
	addState(NewChart: Chart){
		if(this.actualState !== undefined){
			this.ChartUndo.push(this.actualState)
		}
		this.actualState=NewChart;
		this.ChartRedo=[];
	}

	undo(){
		if(this.ChartUndo.length > 0){
			let elem = this.ChartUndo.pop();
			if(elem !== undefined){
				this.actualState = elem;
			}
			if(this.actualState !== undefined){
				this.ChartRedo.push(this.actualState);
			}
			
		}
	}

	redo(){
		if(this.ChartRedo.length > 0){
			let elem = this.ChartRedo.pop();
			if(elem !== undefined){
				this.actualState = elem;
			}
			if(this.actualState !== undefined){
				this.ChartUndo.push(this.actualState);
			}
			
		}
		
	}
}