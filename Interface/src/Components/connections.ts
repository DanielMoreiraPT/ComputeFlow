export function connections(node: HTMLElement) { 
	//last known coords
	let lastX: number;
	let lastY: number;

	function handleMousedown(event){
		lastX = event.clientX;
		lastY = event.clientY;
		event.preventDefault();
		event.stopPropagation();
		node.dispatchEvent(new CustomEvent("connectionStart", {
			detail: { lastX, lastY }
		}));
		window.addEventListener("mousemove", handleMousemove);
		window.addEventListener("mouseup", handleMouseup);
		//added now
		window.addEventListener("mousedown", handleDoubleClick);	
	}
	function handleMousemove(event){
	 	const dx = event.clientX - lastX;
		const dy = event.clientY - lastY;
		lastX = event.clientX;
		lastY = event.clientY;
		event.preventDefault();
		node.dispatchEvent(new CustomEvent("connectionDrag", {
			detail: { lastX, lastY, dx, dy }
		}));
	}
	function handleMouseup(event){
		lastX = event.clientX;
		lastY = event.clientY;
		event.preventDefault();
		node.dispatchEvent(new CustomEvent("connectionEnd", {
		detail: { lastX, lastY }
		}));
		window.removeEventListener("mousemove", handleMousemove);
		window.removeEventListener("mouseup", handleMouseup);
	}
	function handleDoubleClick(event){
		//added now
		lastX = event.clientX;
		lastY = event.clientY;
		event.preventDefault();
		node.dispatchEvent(new CustomEvent("connectionEnd", {
		detail: { lastX, lastY }
		}));
		
		window.removeEventListener("mousemove", handleMousemove);
		window.removeEventListener("mouseup", handleMouseup);
		
	}
	node.addEventListener("mousedown", handleMousedown);
	return {
		destroy() {
			node.removeEventListener("mousedown", handleMousedown);
			node.removeEventListener("mouseup", handleMouseup);
			node.removeEventListener("mousemove", handleMousemove);
		}
	};
}
