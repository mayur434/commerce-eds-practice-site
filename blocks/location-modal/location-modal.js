export default async function decorate(block) {
    // console.log("asbhsiab", block);

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'floating-input-wrapper';

    // Create input + label
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'floatingInput';
    input.name = 'floatingInput';
    input.placeholder = ' '; // required for floating label animation
    input.className = 'floating-input';
    input.autocomplete = 'on';
    input.maxLength = 6;
    input.autocomplete = 'pincode';

    const label = document.createElement('label');
    label.htmlFor = 'floatingInput';
    label.textContent = 'Pincode'; // ✅ correct label text

    // Append input and label inside wrapper
    wrapper.append(input, label);

    // ✅ Find <p>Pincode</p> manually (no :contains)
    const allParagraphs = block.querySelectorAll('p');
    let pincodePara = null;

    allParagraphs.forEach((p) => {
        if (p.textContent.trim().toLowerCase() === 'pincode') {
            pincodePara = p;
        }
    });

    if (pincodePara) {
        const parentDiv = pincodePara.closest('div');
        if (parentDiv) {
            parentDiv.replaceWith(wrapper);
            // console.log("✅ Replaced <p>Pincode</p> with floating input wrapper");
        }
    } else {
        console.warn("⚠️ Could not find <p>Pincode</p> element inside modal");
        block.append(wrapper); // fallback
    }

    // Add focus/blur event handlers for animation
    input.addEventListener('focus', () => {
        wrapper.classList.add('active');
    });

    input.addEventListener('blur', () => {
        if (!input.value.trim()) {
            wrapper.classList.remove('active');
        }
    });

}
