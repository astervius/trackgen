const inputTypeButtons = document.querySelectorAll("#input-type button");
const firstPage = document.querySelector(".page");
const PAGE_WIDTH_VW = 95;

const buttonsArray = Array.from(inputTypeButtons);

inputTypeButtons.forEach(button => {
	button.addEventListener("click", () => {
		const index = buttonsArray.indexOf(button);
		
		// update page position
		firstPage.style.marginLeft = -PAGE_WIDTH_VW * index + "vw";

		// update button styles
		inputTypeButtons.forEach(btn => btn.classList.remove("selected"));
		button.classList.add("selected");
	});
});
