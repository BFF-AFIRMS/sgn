package CXGN::List::Transform::Plugin::TraitComponentIds2Order;

use Moose;
use Data::Dumper;

sub name {
    return "trait_component_ids_2_order";
}

sub display_name {
    return "Trait Component IDs to order";
}

sub can_transform {
    my $self = shift;
    my $type1 = shift;
    my $type2 = shift;

    if (($type1 eq "trait_component_ids") and ($type2 eq "order")) {
	return 1;
    }
    else {  return 0; }
}

# Order trait components by the time ontology.
sub transform {
    my $self = shift;
    my $schema = shift;
    my $list = shift;
    my $other = shift;

    # -------------------------------------------------------------------------
    # Identify the time ontology

    my @time_ontologies = [];
    my $time_ontology_cvterm_id = $schema->resultset('Cv::Cvterm')->find({name => 'time_ontology'})->cvterm_id();
    my $time_ontologies_rs = $schema->resultset('Cv::Cvprop')->search({type_id => $time_ontology_cvterm_id});
    while (my $record = $time_ontologies_rs->next()) {
        push(@time_ontologies, $record->cv_id());
    }

    # -------------------------------------------------------------------------
    # Initialize basic information about each component

    my $components = {};
    my $component_names_rs = $schema->resultset('Cv::Cvterm')->search({cvterm_id => {-in => \@$list}});

    while (my $record = $component_names_rs->next()) {
        my $component_id = $record->cvterm_id();
        my $component_name = $record->name();
        my $component_cv = $record->cv_id();

        $components->{$component_id}->{name} = $component_name;
        $components->{$component_id}->{id} = $component_id;

        my $component_order = 0;
        if ( grep( /^$component_cv$/, @time_ontologies ) ) {
            my @component_split = split(' ', $component_name);
            my ($time_unit, $time_value) = ($component_split[0], $component_split[1] + 0);
            if ($component_name =~ /day /) { $component_order = $time_value; }
            if ($component_name =~ /month /) { $component_order = $time_value * 30 }
            if ($component_name =~ /year /) { $component_order = $time_value * 365; }
            $components->{$component_id}->{base} = $time_unit;
        } else {
            $components->{$component_id}->{base} = $component_name;
        }
        $components->{$component_id}->{relative_order} = $component_order;
    }

    # -------------------------------------------------------------------------
    # Sort elements

    my @unsorted_components = map {$components->{$_}} keys %$components;
    my @sorted_components = sort {
           uc($a->{base}) cmp uc($b->{base})
        or $a->{relative_order} <=> $b->{relative_order}
        or $a->{name} <=> $b->{name}
    } @unsorted_components;

    # -------------------------------------------------------------------------
    # Final return value

    my @transform = map { $_->{id} } @sorted_components;
    my @missing = map {! defined $components->{$_} ? $_ : () } @$list;

    return {
        transform => \@transform,
        missing => \@missing,
    };
}

1;
