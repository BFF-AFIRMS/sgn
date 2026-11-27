package CXGN::List::Transform::Plugin::Traits2Order;

use Moose;

sub name {
    return "traits_2_order";
}

sub display_name {
    return "Traits to order";
}

sub can_transform {
    my $self = shift;
    my $type1 = shift;
    my $type2 = shift;

    if (($type1 eq "traits") and ($type2 eq "order")) {
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

    # Transform trait ids to order (both relative and absolute)
    my $trait_ids_2_order = $t->transform($schema, 'trait_ids_2_order', \@trait_ids, $params);
    my @missing_order = @{$trait_ids_2_order ->{'missing'}};
    @trait_ids = @{$trait_ids_2_order->{'transform'}};

    # Transform ordered trait ids back to names
    my $trait_ids_2_name = $t->transform($schema, 'trait_ids_2_trait_names', \@trait_ids, $params);
    my @missing_name = @{$trait_ids_2_name ->{'missing'}};
    my %mapping = map {
        my $display_name = $trait_ids_2_order->{'mapping'}->{$_}->{display_name};
        $display_name => $trait_ids_2_order->{'mapping'}->{$_}
    } @trait_ids;
    $trait_ids_2_name->{mapping} = \%mapping;

    # Summarize missing
    my @missing = (@missing_traits, @missing_order, @missing_name);
    $trait_ids_2_name->{missing} = \@missing;

    return $trait_ids_2_name;
}

1;
