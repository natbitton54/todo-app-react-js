import Swal from 'sweetalert2';

export const showSuccess = (message) => {
    Swal.fire({
        icon: 'success',
        title: 'Success',
        text: message,
    });
};


export const showError = (message) => {
    Swal.fire({
        icon: "error",
        title: "Oops!",
        text: message,
    });
};
