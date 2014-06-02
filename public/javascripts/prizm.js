var prizm = {
  signUp:   function(){
              $('#info-form').lightbox_me({
              });
            },
  submitForm: function(){
                alert('submitting form');
                var confirmText = $('#confirm').html();
                $('#form-body').html(confirmText);
              } 
};
