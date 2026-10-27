export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MealRelay API',
    version: '1.0.0',
    description:
      'REST API documentation for the MealRelay surplus food recovery and distribution coordination platform. Enables food donors to publish excess food, verified community NGOs to reserve and rescue donations, and platform administrators to maintain operational oversight.',
    contact: {
      name: 'MealRelay Support',
      url: 'https://meal-relay.vercel.app'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'Current environment API server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT bearer token in the Authorization header: `Bearer <token>`'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Resource not found' },
              code: { type: 'string', example: 'NOT_FOUND' },
              details: {
                type: 'array',
                items: { type: 'object' },
                nullable: true
              }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'b819f72b-8a4e-4f1e-84b2-297eb0b9f91a' },
          name: { type: 'string', example: 'Alex Morgan' },
          email: { type: 'string', format: 'email', example: 'alex@example.org' },
          role: { type: 'string', enum: ['DONOR', 'NGO', 'ADMIN'], example: 'DONOR' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Organization: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'c129e120-76bc-45f8-b32f-48895029a1bb' },
          name: { type: 'string', example: 'City Kitchens' },
          type: { type: 'string', enum: ['DONOR', 'NGO'], example: 'DONOR' },
          approvalStatus: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'], example: 'APPROVED' },
          address: { type: 'string', example: '100 Main St' },
          locality: { type: 'string', example: 'Downtown' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Donation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Fresh Veggie Rice Bowls' },
          description: { type: 'string', example: '50 prepared rice meal trays sealed at 3 PM' },
          quantity: { type: 'number', example: 50 },
          unit: { type: 'string', example: 'meals' },
          foodType: { type: 'string', enum: ['COOKED_MEALS', 'BAKERY', 'PRODUCE', 'DAIRY', 'PACKAGED', 'BEVERAGES', 'OTHER'], example: 'COOKED_MEALS' },
          preparedAt: { type: 'string', format: 'date-time' },
          consumeBy: { type: 'string', format: 'date-time' },
          pickupDeadline: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['OPEN', 'CLAIMED', 'COMPLETED', 'EXPIRED', 'CANCELLED'], example: 'OPEN' },
          donorOrganizationId: { type: 'string', format: 'uuid' },
          claimedByOrganizationId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      AuditEvent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          action: { type: 'string', example: 'STATUS_TRANSITION' },
          previousStatus: { type: 'string', nullable: true, example: 'OPEN' },
          newStatus: { type: 'string', nullable: true, example: 'CLAIMED' },
          createdAt: { type: 'string', format: 'date-time' },
          actorUser: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Service Health Check',
        description: 'Returns the operational status of the API server and database connection.',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'API is healthy and database is connected.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'MealRelay API' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number', example: 120.45 },
                    database: { type: 'string', example: 'connected' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service degraded or database disconnected.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register User and Organization',
        description: 'Creates a new user account, associated organization, and owner membership. Initial organization status is set to PENDING.',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'organizationName', 'organizationType', 'address', 'locality'],
                properties: {
                  name: { type: 'string', example: 'Jane Doe' },
                  email: { type: 'string', format: 'email', example: 'jane@communitypantry.org' },
                  password: { type: 'string', format: 'password', minLength: 8, example: 'SecurePassword123' },
                  organizationName: { type: 'string', example: 'Community Food Pantry' },
                  organizationType: { type: 'string', enum: ['DONOR', 'NGO'], example: 'NGO' },
                  address: { type: 'string', example: '456 Charity Way' },
                  locality: { type: 'string', example: 'Uptown' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Account successfully registered.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Registration successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        organization: { $ref: '#/components/schemas/Organization' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'User Login',
        description: 'Authenticates a user with email and password, returning a signed JWT token.',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'jane@communitypantry.org' },
                  password: { type: 'string', format: 'password', example: 'SecurePassword123' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        organization: { $ref: '#/components/schemas/Organization' },
                        token: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get Current Authenticated Profile',
        description: 'Returns profile details and active organization membership for the token bearer.',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        organization: { $ref: '#/components/schemas/Organization' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Missing or expired token' }
        }
      }
    },
    '/donations': {
      get: {
        summary: 'Browse and Discover Donations',
        description: 'List available food donations with optional filtering by status, food type, locality, and pagination.',
        tags: ['Donations'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'CLAIMED', 'COMPLETED', 'EXPIRED', 'CANCELLED'] } },
          { name: 'foodType', in: 'query', schema: { type: 'string' } },
          { name: 'locality', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }
        ],
        responses: {
          '200': {
            description: 'List of matching donations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        donations: { type: 'array', items: { $ref: '#/components/schemas/Donation' } },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer', example: 1 },
                            limit: { type: 'integer', example: 20 },
                            total: { type: 'integer', example: 42 },
                            totalPages: { type: 'integer', example: 3 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create Surplus Food Donation',
        description: 'Creates a new donation listing. Requires DONOR role with an APPROVED organization.',
        tags: ['Donations'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'quantity', 'unit', 'foodType', 'preparedAt', 'consumeBy', 'pickupDeadline'],
                properties: {
                  title: { type: 'string', example: 'Surplus Prepared Rice & Curry' },
                  description: { type: 'string', example: 'Packed in food-grade insulated containers' },
                  quantity: { type: 'number', example: 40 },
                  unit: { type: 'string', example: 'portions' },
                  foodType: { type: 'string', enum: ['COOKED_MEALS', 'BAKERY', 'PRODUCE', 'DAIRY', 'PACKAGED', 'BEVERAGES', 'OTHER'], example: 'COOKED_MEALS' },
                  preparedAt: { type: 'string', format: 'date-time' },
                  consumeBy: { type: 'string', format: 'date-time' },
                  pickupDeadline: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Donation successfully created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Donation' }
                  }
                }
              }
            }
          },
          '400': { description: 'Validation error' },
          '403': { description: 'Requires APPROVED DONOR organization' }
        }
      }
    },
    '/donations/{id}': {
      get: {
        summary: 'Get Donation Details',
        description: 'Retrieves full details of a specific donation including donor and claiming organization info.',
        tags: ['Donations'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Donation details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Donation' }
                  }
                }
              }
            }
          },
          '404': { description: 'Donation not found' }
        }
      },
      patch: {
        summary: 'Update Open Donation',
        description: 'Updates details of an OPEN donation. Only allowed by the donor organization owner.',
        tags: ['Donations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unit: { type: 'string' },
                  foodType: { type: 'string' },
                  pickupDeadline: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Donation updated successfully' },
          '403': { description: 'Not authorized to edit this donation' },
          '404': { description: 'Donation not found' }
        }
      }
    },
    '/donations/{id}/claim': {
      post: {
        summary: 'Claim / Reserve Donation',
        description: 'NGOs reserve an available OPEN donation. Concurrency-safe: generates a secure 6-digit pickup verification code.',
        tags: ['Donations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Donation claimed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Donation claimed successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        donation: { $ref: '#/components/schemas/Donation' },
                        pickupCode: { type: 'string', example: '482910' }
                      }
                    }
                  }
                }
              }
            }
          },
          '403': { description: 'Requires APPROVED NGO organization' },
          '409': { description: 'Donation is no longer OPEN' }
        }
      }
    },
    '/donations/{id}/pickup-code': {
      get: {
        summary: 'Retrieve Pickup Code',
        description: 'Retrieves the 6-digit verification code. Accessible only by the claiming NGO organization.',
        tags: ['Donations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Pickup code details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        pickupCode: { type: 'string', example: '482910' },
                        expiresAt: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          },
          '403': { description: 'Only claiming NGO can view the pickup code' }
        }
      }
    },
    '/donations/{id}/verify-pickup': {
      post: {
        summary: 'Verify Pickup Code and Complete Transfer',
        description: 'Donor verifies the 6-digit pickup code presented by the NGO upon collection. Transitions status to COMPLETED.',
        tags: ['Donations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['pickupCode'],
                properties: {
                  pickupCode: { type: 'string', minLength: 6, maxLength: 6, example: '482910' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Pickup successfully verified and donation marked COMPLETED',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Pickup verified successfully' },
                    data: { $ref: '#/components/schemas/Donation' }
                  }
                }
              }
            }
          },
          '400': { description: 'Incorrect pickup code' },
          '403': { description: 'Only donor owner can verify pickup' }
        }
      }
    },
    '/donations/{id}/cancel': {
      post: {
        summary: 'Cancel Donation or Reservation',
        description: 'Cancels an OPEN or CLAIMED donation. Donors can cancel their listing; claiming NGOs can release their reservation.',
        tags: ['Donations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Food spoiled due to storage malfunction' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Donation successfully cancelled' },
          '400': { description: 'Cannot cancel a completed or expired donation' }
        }
      }
    },
    '/donations/{id}/history': {
      get: {
        summary: 'Get Donation Audit Trail',
        description: 'Returns the chronological sequence of state transitions and actor actions for a donation.',
        tags: ['Donations'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Audit history list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AuditEvent' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/organizations': {
      get: {
        summary: 'List Organizations (Admin Only)',
        description: 'Lists all registered organizations with optional status filtering. Restricted to platform administrators.',
        tags: ['Organizations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'approvalStatus', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['DONOR', 'NGO'] } }
        ],
        responses: {
          '200': {
            description: 'List of organizations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Organization' } }
                  }
                }
              }
            }
          },
          '403': { description: 'Forbidden: Admin access required' }
        }
      }
    },
    '/organizations/{id}': {
      get: {
        summary: 'Get Organization Profile',
        description: 'Returns public profile details for an organization.',
        tags: ['Organizations'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Organization details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Organization' }
                  }
                }
              }
            }
          },
          '404': { description: 'Organization not found' }
        }
      }
    },
    '/organizations/{id}/approval': {
      patch: {
        summary: 'Update Organization Approval Status (Admin Only)',
        description: 'Approves or rejects a donor/NGO organization registration. Restricted to platform administrators.',
        tags: ['Organizations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['approvalStatus'],
                properties: {
                  approvalStatus: { type: 'string', enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Organization status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Organization' }
                  }
                }
              }
            }
          },
          '403': { description: 'Forbidden: Admin access required' }
        }
      }
    },
    '/dashboard/summary': {
      get: {
        summary: 'Get Platform Impact Summary',
        description: 'Retrieves high-level platform statistics including active offers, total food rescued, and active partners.',
        tags: ['Dashboard'],
        responses: {
          '200': {
            description: 'Platform summary metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalDonations: { type: 'integer', example: 142 },
                        activeDonations: { type: 'integer', example: 18 },
                        completedDonations: { type: 'integer', example: 114 },
                        totalQuantityRescued: { type: 'number', example: 4820.5 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/admin/bootstrap': {
      post: {
        summary: 'One-Time Administrator Provisioning',
        description: 'Provisions initial administrator credentials. Guarded by rate limiting, timing-safe checks, and server-side environment configuration. Permanently locks upon first successful invocation.',
        tags: ['Administration'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['secret', 'email'],
                properties: {
                  secret: { type: 'string', example: '••••••••••••••••' },
                  email: { type: 'string', format: 'email', example: 'admin@mealrelay.org' },
                  password: { type: 'string', format: 'password', minLength: 8, example: 'AdminPassphrase123' },
                  name: { type: 'string', example: 'System Administrator' },
                  organizationName: { type: 'string', example: 'MealRelay Operational Hub' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Administrator account provisioned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Administrator account successfully provisioned and secured.' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        organization: { $ref: '#/components/schemas/Organization' }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { description: 'Validation error or missing password for new user' },
          '401': { description: 'Invalid administrator bootstrap credentials' },
          '403': { description: 'Bootstrap disabled or already completed' },
          '429': { description: 'Too many bootstrap attempts' }
        }
      }
    }
  }
};
