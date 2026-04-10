from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user info (role, name) to the JWT response."""
    
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'organization', 'avatar',
            'is_verified', 'avg_risk_score', 'total_exams_taken',
            'total_violations', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'role', 'phone', 'organization',
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        if User.objects.filter(email=attrs.get('email', '')).exists():
            raise serializers.ValidationError({'email': 'Email already registered.'})
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password'],
            role=validated_data.get('role', User.Role.CANDIDATE),
            phone=validated_data.get('phone', ''),
            organization=validated_data.get('organization', ''),
        )
        return user


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'organization', 'avatar']
