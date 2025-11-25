export default async function decorate(block) {
    const searchParagraph = block.querySelector('p');
    if (searchParagraph) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = searchParagraph.textContent.trim();
        input.classList.add('search-input');
        searchParagraph.parentNode.replaceChild(input, searchParagraph);
    }
}