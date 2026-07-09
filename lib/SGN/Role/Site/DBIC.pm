package SGN::Role::Site::DBIC;
use 5.10.0;

use Moose::Role;
use namespace::autoclean;

use Carp;
use Data::Dumper;
use Class::Load ':all';

requires
    'dbc_profile',
    'ensure_dbh_search_path_is_set',
    ;


=head2 dbic_schema

  Usage: my $schema = $c->dbic_schema( 'Schema::Package', 'connection_name' );
  Desc : get a L<DBIx::Class::Schema> with the proper connection
         parameters for the given connection name
  Args : L<DBIx::Class> schema package name,
         (optional) connection name to use,
         (optional) sp_person_id to set for database audit triggers
  Ret  : schema object
  Side Effects: dies on failure

=cut

sub dbic_schema {
    my ( $class, $schema_name, $profile_name, $sp_person_id ) = @_;

    $class = ref $class if ref $class;
    $schema_name or croak "must provide a schema package name to dbic_schema";
    load_class( $schema_name );
    state %schema_cache;

    my $schema = $schema_cache{$class}{$profile_name || ''}{$schema_name} ||= do {
        my $profile = $class->dbc_profile( $profile_name );
        $schema_name->connect(
            @{$profile}{qw| dsn user password attributes |},
            {
                on_connect_call => sub {
                    $class->ensure_dbh_search_path_is_set( my $dbh = shift->dbh );
                },
            }
        );
    };

    # Normalise user ID
    $sp_person_id = undef unless defined($sp_person_id) && $sp_person_id =~ /^\d+$/;

    my $dbh = $schema->storage->dbh;

    # Only update the logged_in_user table if the user ID has changed
    if ( !exists $dbh->{private_sgn_user_id} || ($dbh->{private_sgn_user_id} // '') ne ($sp_person_id // '') ) {
        $dbh->do("CREATE temporary table IF NOT EXISTS logged_in_user (sp_person_id bigint)");
        $dbh->do("DELETE FROM logged_in_user");

        if ( defined $sp_person_id ) {
            $dbh->prepare_cached("INSERT INTO logged_in_user (sp_person_id) VALUES (?)")
                ->execute($sp_person_id);
        }
        $dbh->{private_sgn_user_id} = $sp_person_id;
    }

    return $schema;
}

1;
