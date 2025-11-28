document.addEventListener("DOMContentLoaded", function() {
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('imagePreview');
    const newProductForm = document.getElementById('newProductForm');

    // Live image preview
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
            }
            reader.readAsDataURL(file);
        } else {
            imagePreview.src = "#";
            imagePreview.style.display = "none";
        }
    });

    // Basic form validation
    newProductForm.addEventListener('submit', function(e){
        if (!imageInput.files[0]) {
            alert("Please select an image.");
            e.preventDefault();
        }
    });

    // Confirmation after adding product
    const added = document.body.dataset.added === "true";
    if (added) {
        const result = confirm("Product added successfully!\nDo you want to add another product?");
        if (!result) {
            // Go back to product list
            window.location.href = "/admin/manage-products";
        }
        // else: stay on the page to add another product
    }
});
