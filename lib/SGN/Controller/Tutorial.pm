
package SGN::Controller::Help;

use Moose;

BEGIN { extends "Catalyst::Controller"; }

sub tutorials : Path('/tutorials') Args(0) { 
    my $self = shift;
    my $c = shift;

    $c->stash->{template} = '/tutorials/index.mas';
}

sub tutorials_section : Path('/tutorials') Args(1) { 
    my $self = shift;
    my $c = shift;
    my $section = shift;
    $section =~ s/\.\.//g; # prevent shenanigans

    
    my $component = '/tutorials/'.$section.".mas";
    if ($c->view("Mason")->interp->comp_exists($component)) { 
	$c->stash->{basepath} = $c->config->{basepath};
	$c->stash->{documents_subdir} = $c->config->{documents_subdir};
	$c->stash->{template} = '/tutorials/'.$section.".mas";

	
    }
    else { 
    	$c->stash->{template} = '/generic_message.mas';
	$c->stash->{message}  = 'The requested page could not be found. <br /><a href="/tutorials">Tutorials page</a>';
    }
}

1;
