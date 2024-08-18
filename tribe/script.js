document.addEventListener('DOMContentLoaded', function() {
    const dropdowns = document.querySelectorAll('.form-dropdown');

    dropdowns.forEach(dropdown => {
        const summary = dropdown.querySelector('summary');
        const content = dropdown.querySelector('.form-content');

        summary.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent the default toggle behavior

            dropdowns.forEach(otherDropdown => {
                if (otherDropdown !== dropdown) {
                    otherDropdown.removeAttribute('open');
                }
            });

            dropdown.toggleAttribute('open');
        });
    });
});
