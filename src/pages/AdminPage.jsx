import { useMemo, useState } from 'react';
import styled from '@emotion/styled';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI } from '../services/api';
import { authAPIService } from '../services/authApi';

const Container = styled.div`
  padding: 2rem 0;
`;

const Title = styled.h2`
  margin-bottom: 1rem;
`;

const TabContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.5rem 0;
`;

const TabButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;

  &[aria-pressed='true'] {
    background: #667eea;
    color: white;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 2rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  min-width: 0;
  background: white;
  border-radius: 12px;
  padding: 1rem;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;

  th,
  td {
    border-bottom: 1px solid #eee;
    padding: 0.75rem;
    text-align: left;
    overflow-wrap: anywhere;
  }

  th {
    background: #fafafa;
  }

  tr:hover {
    background: #fafafa;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Button = styled.button`
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #f5f5f5;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Danger = styled(Button)`
  color: #e53935;
  border-color: #ffb3ba;
`;

const FormRow = styled.div`
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  min-height: 80px;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
`;

const ErrorText = styled.p`
  color: #d32f2f;
  margin-top: 0.25rem;
`;

function errorMessage(error) {
  return (
    error.userMessage ||
    error.response?.data?.error?.message ||
    error.response?.data?.message ||
    error.message ||
    '요청에 실패했습니다.'
  );
}

function providerLabel(provider) {
  if (provider === 'google') return '구글';

  if (['naver', 'custom:naver'].includes(provider)) {
    return '네이버';
  }

  return '이메일';
}

const emptyForm = {
  name: '',
  category: '',
  location: '',
  priceRange: '',
  rating: '',
  description: '',
  recommendedMenu: '',
  image: '',
};

function AdminPage() {
  const { checkAuthStatus, user, isAdmin } = useAuth();
  const administrator = isAdmin();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('restaurants');

  const canEdit = (restaurant) =>
    administrator ||
    Boolean(
      user?.id &&
      restaurant.createdBy === user.id,
    );

  const categories = useMemo(
    () => [
      '한식',
      '중식',
      '일식',
      '양식',
      '아시안',
      '분식',
      '카페',
      '기타',
    ],
    [],
  );

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['restaurants'],
    queryFn: restaurantAPI.getRestaurants,
  });

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ['users'],
    queryFn: authAPIService.getAllUsers,
    enabled: administrator && activeTab === 'users',
    retry: 1,
  });

  const restaurants = data?.data || [];
  const users = usersData?.data?.users || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: {
      isSubmitting,
      errors,
    },
  } = useForm({
    defaultValues: { ...emptyForm },
  });

  const refreshRestaurants = () =>
    queryClient.invalidateQueries();

  const resetForm = () => {
    setSelected(null);
    reset({ ...emptyForm });
  };

  const createMutation = useMutation({
    mutationFn: restaurantAPI.createRestaurant,

    onSuccess: () => {
      toast.success('생성 완료');
      resetForm();
      void refreshRestaurants();
    },

    onError: (requestError) => {
      toast.error(errorMessage(requestError));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      restaurantAPI.updateRestaurant(id, payload),

    onSuccess: () => {
      toast.success('수정 완료');
      resetForm();
      void refreshRestaurants();
    },

    onError: (requestError) => {
      toast.error(errorMessage(requestError));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      restaurantAPI.deleteRestaurant(id),

    onSuccess: (_result, deletedId) => {
      toast.info('삭제 완료');

      if (
        selected &&
        String(selected.id) === String(deletedId)
      ) {
        resetForm();
      }

      void refreshRestaurants();
    },

    onError: (requestError) => {
      toast.error(errorMessage(requestError));
    },
  });

  const changeUserTypeMutation = useMutation({
    mutationFn: ({ userId, userType }) =>
      authAPIService.changeUserType(userId, userType),

    onSuccess: async () => {
      toast.success('사용자 유형이 변경되었습니다.');

      await queryClient.invalidateQueries({
        queryKey: ['users'],
      });

      try {
        await checkAuthStatus();
      } catch (requestError) {
        toast.error(errorMessage(requestError));
      }
    },
  });

  const busy =
    isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const onEdit = (restaurant) => {
    if (!canEdit(restaurant)) return;

    setSelected(restaurant);

    setValue('name', restaurant.name);
    setValue('category', restaurant.category);
    setValue('location', restaurant.location);
    setValue('priceRange', restaurant.priceRange || '');
    setValue('rating', restaurant.rating ?? 0);
    setValue('description', restaurant.description || '');

    setValue(
      'recommendedMenu',
      (restaurant.recommendedMenu || []).join(', '),
    );

    setValue('image', restaurant.image || '');
  };

  const onSubmit = async (form) => {
    const name = form.name?.trim();
    const category = form.category?.trim();
    const location = form.location?.trim();

    if (!name || !category || !location) {
      toast.error('이름, 카테고리, 위치를 입력해 주세요.');
      return;
    }

    const recommendedMenu =
      typeof form.recommendedMenu === 'string'
        ? form.recommendedMenu
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

    const payload = {
      name,
      category,
      location,
      priceRange: form.priceRange?.trim() || '',
      rating:
        form.rating !== '' &&
        form.rating !== undefined
          ? Number(form.rating)
          : 0,
      description: form.description?.trim() || '',
      recommendedMenu,
      image: form.image?.trim() || '',
    };

    try {
      if (selected) {
        if (!canEdit(selected)) {
          toast.error('수정 권한이 없습니다.');
          return;
        }

        await updateMutation.mutateAsync({
          id: selected.id,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch {
      // 각 mutation의 onError에서 오류를 안내합니다.
    }
  };

  const onDelete = async (restaurant) => {
    if (!canEdit(restaurant)) return;

    const confirmed = window.confirm(
      `[삭제] ${restaurant.name}을(를) 삭제할까요?`,
    );

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(restaurant.id);
    } catch {
      // mutation의 onError에서 오류를 안내합니다.
    }
  };

  const onChangeUserType = async (
    targetUser,
    newUserType,
  ) => {
    if (!administrator) return;

    const roleName =
      newUserType === 'admin'
        ? '관리자'
        : '일반 사용자';

    const confirmed = window.confirm(
      `${targetUser.name}님의 유형을 ${roleName}로 변경할까요?\nUUID: ${targetUser.id}`,
    );

    if (!confirmed) return;

    try {
      await changeUserTypeMutation.mutateAsync({
        userId: targetUser.id,
        userType: newUserType,
      });
    } catch (requestError) {
      toast.error(errorMessage(requestError));
    }
  };

  if (isLoading) {
    return (
      <Container>
        <p>맛집 목록을 불러오는 중입니다.</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <h2>목록을 불러오지 못했습니다.</h2>
        <p>{errorMessage(error)}</p>
      </Container>
    );
  }

  return (
    <Container>
      <Title>
        {administrator
          ? '관리자 페이지'
          : '맛집 등록·관리'}
      </Title>

      <p>
        회원은 본인이 등록한 맛집만 수정·삭제할 수 있습니다.
      </p>

      <TabContainer>
        <TabButton
          type="button"
          aria-pressed={activeTab === 'restaurants'}
          onClick={() => setActiveTab('restaurants')}
        >
          레스토랑 관리
        </TabButton>

        {administrator && (
          <TabButton
            type="button"
            aria-pressed={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
          >
            사용자 관리
          </TabButton>
        )}
      </TabContainer>

      {activeTab === 'restaurants' && (
        <Grid>
          <Panel>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>이름</th>
                    <th>카테고리</th>
                    <th>평점</th>
                    <th>위치</th>
                    <th>액션</th>
                  </tr>
                </thead>

                <tbody>
                  {restaurants.map((restaurant) => (
                    <tr key={restaurant.id}>
                      <td>{restaurant.id}</td>
                      <td>{restaurant.name}</td>
                      <td>{restaurant.category}</td>
                      <td>{restaurant.rating}</td>
                      <td>{restaurant.location}</td>

                      <td>
                        <Actions>
                          <Button
                            type="button"
                            disabled={
                              busy || !canEdit(restaurant)
                            }
                            title={
                              canEdit(restaurant)
                                ? '수정'
                                : '본인 또는 관리자만 수정할 수 있습니다.'
                            }
                            onClick={() =>
                              onEdit(restaurant)
                            }
                          >
                            수정
                          </Button>

                          <Danger
                            type="button"
                            disabled={
                              busy || !canEdit(restaurant)
                            }
                            onClick={() =>
                              onDelete(restaurant)
                            }
                          >
                            삭제
                          </Danger>
                        </Actions>
                      </td>
                    </tr>
                  ))}

                  {restaurants.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        등록된 맛집이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </TableWrapper>
          </Panel>

          <Panel>
            <h3>
              {selected
                ? `수정: ${selected.name}`
                : '새 레스토랑 추가'}
            </h3>

            <form onSubmit={handleSubmit(onSubmit)}>
              <FormRow>
                <label htmlFor="name">이름 *</label>

                <Input
                  id="name"
                  {...register('name', {
                    required: '이름은 필수입니다.',
                  })}
                />

                {errors.name && (
                  <ErrorText>
                    {errors.name.message}
                  </ErrorText>
                )}
              </FormRow>

              <FormRow>
                <label htmlFor="category">
                  카테고리 *
                </label>

                <Select
                  id="category"
                  {...register('category', {
                    required: '카테고리는 필수입니다.',
                  })}
                >
                  <option value="">선택</option>

                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </Select>

                {errors.category && (
                  <ErrorText>
                    {errors.category.message}
                  </ErrorText>
                )}
              </FormRow>

              <FormRow>
                <label htmlFor="location">위치 *</label>

                <Input
                  id="location"
                  {...register('location', {
                    required: '위치는 필수입니다.',
                  })}
                />

                {errors.location && (
                  <ErrorText>
                    {errors.location.message}
                  </ErrorText>
                )}
              </FormRow>

              <FormRow>
                <label htmlFor="priceRange">가격대</label>

                <Input
                  id="priceRange"
                  {...register('priceRange')}
                />
              </FormRow>

              <FormRow>
                <label htmlFor="rating">평점</label>

                <Input
                  id="rating"
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  {...register('rating')}
                />
              </FormRow>

              <FormRow>
                <label htmlFor="recommendedMenu">
                  추천 메뉴
                </label>

                <Textarea
                  id="recommendedMenu"
                  {...register('recommendedMenu')}
                  placeholder="쉼표 또는 줄바꿈으로 구분"
                />
              </FormRow>

              <FormRow>
                <label htmlFor="image">이미지 URL</label>

                <Input
                  id="image"
                  {...register('image')}
                />
              </FormRow>

              <FormRow>
                <label htmlFor="description">설명</label>

                <Textarea
                  id="description"
                  {...register('description')}
                />
              </FormRow>

              <Actions>
                <Button
                  type="submit"
                  disabled={busy}
                >
                  {isSubmitting
                    ? '처리 중...'
                    : selected
                      ? '수정'
                      : '생성'}
                </Button>

                <Button
                  type="button"
                  disabled={busy}
                  onClick={resetForm}
                >
                  초기화
                </Button>
              </Actions>
            </form>
          </Panel>
        </Grid>
      )}

      {administrator && activeTab === 'users' && (
        <Panel>
          <h3>사용자 목록</h3>

          {usersLoading ? (
            <p>사용자 목록을 불러오는 중입니다.</p>
          ) : usersError ? (
            <ErrorText>
              {errorMessage(usersError)}
            </ErrorText>
          ) : (
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>사용자 UUID</th>
                    <th>이메일</th>
                    <th>계정 종류</th>
                    <th>사용자 유형</th>
                    <th>가입일</th>
                    <th>액션</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((targetUser) => (
                    <tr key={targetUser.id}>
                      <td>{targetUser.name}</td>

                      <td>
                        <code>{targetUser.id}</code>
                      </td>

                      <td>
                        {targetUser.email || '미제공'}
                      </td>

                      <td>
                        {providerLabel(targetUser.provider)}
                      </td>

                      <td>
                        {targetUser.userType === 'admin'
                          ? '관리자'
                          : '일반 사용자'}
                      </td>

                      <td>
                        {targetUser.createdAt
                          ? new Date(
                              targetUser.createdAt,
                            ).toLocaleDateString('ko-KR')
                          : '-'}
                      </td>

                      <td>
                        <Button
                          type="button"
                          disabled={
                            changeUserTypeMutation.isPending
                          }
                          onClick={() =>
                            onChangeUserType(
                              targetUser,
                              targetUser.userType === 'admin'
                                ? 'user'
                                : 'admin',
                            )
                          }
                        >
                          {targetUser.userType === 'admin'
                            ? '일반 사용자로 변경'
                            : '관리자로 변경'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          )}
        </Panel>
      )}
    </Container>
  );
}

export default AdminPage;