var prizm = {
  signUp:   function(){
              $('#info-form').lightbox_me({
              });
            },
  submitForm: function(){
                var confirmText = $('#confirm').html();
                $('#form-body').html(confirmText);
              } 
};
