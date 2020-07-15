import { Module, Port, Connection, Chart } from './StructureLogic';


export class ChartHistory {

	__redoStack : string[] = [];
	__undoStack : string[] = [];
	constructor(){
		this.__redoStack=[];
		this.__undoStack=[];
	}
	
	redo(ChartStruc: Chart): string|undefined{
		const newState = this.__redoStack.pop();
		if(newState){
			this.__undoStack.push(ChartStruc.toJSON());
		}
		return newState;
	}	
	undo(ChartStruc: Chart): string|undefined{
		const newState = this.__undoStack.pop();
		if (newState){
			this.__redoStack.push(ChartStruc.toJSON());
		}
		return newState;

	}
	addState(OldState: string): void{
		this.__undoStack.push(OldState);
		if (this.__redoStack.length>0){
			this.__redoStack=[];
		}
	}	
	clear(): void{
		this.__redoStack.splice(0, this.__redoStack.length);
		this.__undoStack.splice(0, this.__undoStack.length);
	}

}