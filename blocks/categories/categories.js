export default function decorate(block) {
    // Toggle categories (like Mixer Grinder, Nutri Blend)
    document.querySelectorAll('.categories > div > div:first-child').forEach(header => {
        header.addEventListener('click', () => {
            const parent = header.parentElement;
            parent.classList.toggle('active');
        });
    });

    // Collapse/expand subcategories (Brand, Capacity, etc.)
    document.querySelectorAll('.categories ul > li > p').forEach(section => {
        section.addEventListener('click', () => {
            const parentLi = section.parentElement;
            const subList = parentLi.querySelector('ul');
            const isCollapsed = parentLi.classList.toggle('collapsed');
            subList.style.display = isCollapsed ? 'none' : 'block';
        });
    });

    // Initialize expanded by default
    document.querySelectorAll('.categories ul > li').forEach(li => {
        li.classList.remove('collapsed');
        const subList = li.querySelector('ul');
        if (subList) subList.style.display = 'block';
    });
}


