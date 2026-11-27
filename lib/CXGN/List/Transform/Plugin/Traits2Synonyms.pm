package CXGN::List::Transform::Plugin::Traits2Synonyms;

use Moose;

sub name {
    return "traits_2_synonyms";
}

sub display_name {
    return "Traits to synonyms";
}

sub can_transform {
    my $self = shift;
    my $type1 = shift;
    my $type2 = shift;

    if (($type1 eq "traits") and ($type2 eq "synonyms")) {
        return 1;
    } else {
        return 0;
    }
}


sub transform {
    my $self = shift;
    my $schema = shift;
    my $list = shift;
    my $other = shift;
    my $params = shift || {};

    my $t = CXGN::List::Transform->new();

    # Transform full trait names to trait ids (cvterm_id)
    my $traits_2_trait_ids = $t->transform($schema, 'traits_2_trait_ids', $list, $params);
    my @missing_traits = @{$traits_2_trait_ids->{'missing'}};
    my @trait_ids = @{$traits_2_trait_ids->{'transform'}};

    # Transform trait ids to synonyms
    my $trait_ids_2_synonyms = $t->transform($schema, 'trait_ids_2_synonyms', \@trait_ids, $params);
    my @missing_synonyms = @{$trait_ids_2_synonyms->{'missing'}};

    # Summarize missing
    my @missing = (@missing_traits, @missing_synonyms);
    $trait_ids_2_synonyms->{missing} = \@missing;

    return $trait_ids_2_synonyms;
}

1;
