<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class Terra_CPT {
    public static function register() {
        register_post_type( 'property', array(
            'labels'              => array(
                'name'          => __( 'Properties', 'terra-realestate' ),
                'singular_name' => __( 'Property', 'terra-realestate' ),
            ),
            'public'              => true,
            'has_archive'         => false,
            'show_in_rest'        => true,
            'menu_icon'           => 'dashicons-admin-home',
            'supports'            => array( 'title', 'editor', 'thumbnail' ),
            'show_in_graphql'     => true,
            'graphql_single_name' => 'property',
            'graphql_plural_name' => 'properties',
        ) );
    }
}
