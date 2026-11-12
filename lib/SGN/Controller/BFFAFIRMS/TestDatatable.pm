package SGN::Controller::BFFAFIRMS::TestDatatable;

use Moose;

BEGIN {
    extends 'Catalyst::Controller';
}

sub index : Path('/test_datatable') Args(0) {
	my ($self, $c) = @_;

	$c->stash(
		template => '/test/test_datatable.mas',
	);
}

1;