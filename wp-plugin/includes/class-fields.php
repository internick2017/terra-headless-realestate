<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class Terra_Fields {
    public static function register() {
        if ( ! function_exists( 'acf_add_local_field_group' ) ) { return; }

        acf_add_local_field_group( array(
            'key'      => 'group_property',
            'title'    => 'Property details',
            'location' => array( array( array(
                'param'    => 'post_type',
                'operator' => '==',
                'value'    => 'property',
            ) ) ),
            'show_in_graphql'     => 1,
            'graphql_field_name'  => 'propertyFields',
            'fields'   => self::fields(),
        ) );
    }

    private static function select( $key, $label, $choices ) {
        return array(
            'key' => "field_{$key}", 'label' => $label, 'name' => $key,
            'type' => 'select', 'choices' => $choices,
            'show_in_graphql' => 1, 'graphql_field_name' => $key,
        );
    }

    private static function basic( $key, $label, $type ) {
        return array(
            'key' => "field_{$key}", 'label' => $label, 'name' => $key,
            'type' => $type, 'show_in_graphql' => 1, 'graphql_field_name' => $key,
        );
    }

    private static function fields() {
        return array(
            self::basic( 'price', 'Price', 'number' ),
            self::select( 'currency', 'Currency', array( 'USD' => 'USD', 'BRL' => 'BRL' ) ),
            self::select( 'operation', 'Operation', array( 'sale' => 'Sale', 'rent' => 'Rent' ) ),
            self::select( 'propertyType', 'Type', array(
                'house' => 'House', 'apartment' => 'Apartment',
                'land' => 'Land', 'commercial' => 'Commercial',
            ) ),
            self::basic( 'bedrooms', 'Bedrooms', 'number' ),
            self::basic( 'bathrooms', 'Bathrooms', 'number' ),
            self::basic( 'areaM2', 'Area (m2)', 'number' ),
            self::basic( 'address', 'Address', 'text' ),
            self::basic( 'neighborhoodName', 'Neighborhood', 'text' ),
            self::basic( 'latitude', 'Latitude', 'number' ),
            self::basic( 'longitude', 'Longitude', 'number' ),
            self::select( 'status', 'Status', array(
                'available' => 'Available', 'reserved' => 'Reserved', 'sold' => 'Sold',
            ) ),
            self::basic( 'gallery', 'Gallery', 'gallery' ),
            self::basic( 'agentName', 'Agent name', 'text' ),
            self::basic( 'agentEmail', 'Agent email', 'email' ),
        );
    }
}
