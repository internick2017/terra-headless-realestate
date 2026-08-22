<?php
/**
 * Plugin Name: Terra Real Estate
 * Description: Headless real estate backend: property CPT, ACF fields, and GraphQL exposure for a Next.js frontend.
 * Version: 0.1.0
 * Author: Nick Granados
 * Text Domain: terra-realestate
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

require_once __DIR__ . '/includes/class-cpt.php';

add_action( 'init', array( 'Terra_CPT', 'register' ) );

require_once __DIR__ . '/includes/class-fields.php';
add_action( 'acf/init', array( 'Terra_Fields', 'register' ) );

require_once __DIR__ . '/includes/class-i18n.php';
add_filter( 'pll_get_post_types', array( 'Terra_I18n', 'translatable_post_types' ), 10, 1 );

require_once __DIR__ . '/includes/class-seed-output.php';
require_once __DIR__ . '/includes/class-admin.php';
add_action( 'admin_menu', array( 'Terra_Admin', 'register' ) );
