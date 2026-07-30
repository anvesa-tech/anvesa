import { validateProfile, type HealthProfileInput } from '../../domain/profile/validation';

export interface ProfileRepository {
  get(userId: string): Promise<HealthProfileInput | null>;
  upsert(userId: string, input: HealthProfileInput): Promise<void>;
}

export type UpsertResult = { ok: true } | { ok: false; invalidField: string };

/**
 * Profile_Service (Requirement 4). Validates the health profile against ranges
 * and value sets; rejected input leaves any stored profile unchanged.
 */
export class ProfileService {
  constructor(private readonly repo: ProfileRepository) {}

  get(userId: string): Promise<HealthProfileInput | null> {
    return this.repo.get(userId);
  }

  async upsert(userId: string, input: HealthProfileInput): Promise<UpsertResult> {
    const validation = validateProfile(input);
    if (!validation.ok) return { ok: false, invalidField: validation.invalidField };
    await this.repo.upsert(userId, input);
    return { ok: true };
  }
}
